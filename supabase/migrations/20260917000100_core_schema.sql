-- =============================================================================
-- Our Story :: 0100 core schema
--
-- Tenant root:        public.couples
-- Tenant boundary:    couple_id (NOT NULL on every tenant-owned table)
-- Security boundary:  RLS + public.couple_members (see 0200_rls.sql)
--
-- Integrity rules that make cross-tenant references impossible at the data
-- layer (independent of RLS):
--   * Every child row that points at a parent row uses a COMPOSITE foreign key
--     (parent_id, couple_id) -> parent(id, couple_id). A row in couple A can
--     therefore never reference a journal/place/letter that lives in couple B.
--   * Every "authored by a member" column uses a composite foreign key
--     (couple_id, user_id) -> couple_members. Letters can only be addressed to
--     someone who is actually in the same couple.
--   * couple_id (and author columns) are immutable after insert (trigger).
--   * A couple can never have more than two members (trigger + row lock).
--   * Storage paths stored in the database must live under the row's own
--     couples/{couple_id}/... prefix (check constraints).
-- =============================================================================

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Generic helpers
-- -----------------------------------------------------------------------------

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Rejects changes to the columns named in TG_ARGV (e.g. couple_id, author_id).
-- Moving a row between tenants, or re-attributing authorship, is never allowed.
create or replace function private.guard_immutable_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_column text;
begin
  foreach v_column in array tg_argv loop
    if (to_jsonb(new) -> v_column) is distinct from (to_jsonb(old) -> v_column) then
      raise exception 'immutable_column'
        using detail = format('%s.%s cannot be changed', tg_table_name, v_column);
    end if;
  end loop;
  return new;
end;
$$;

create or replace function private.try_uuid(p_value text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when p_value ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      then p_value::uuid
  end;
$$;

create or replace function private.slugify(p_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    nullif(
      left(trim(both '-' from regexp_replace(lower(coalesce(p_value, '')), '[^a-z0-9]+', '-', 'g')), 40),
      ''
    ),
    'our-story'
  );
$$;

-- SHA-256 hex digest of an invitation token. Raw tokens are never stored.
create or replace function private.hash_invitation_token(p_token text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
$$;

-- -----------------------------------------------------------------------------
-- profiles  (USER-OWNED — not a tenant table)
-- -----------------------------------------------------------------------------

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 60),
  birthday     date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- couples  (TENANT ROOT)
-- -----------------------------------------------------------------------------

create table public.couples (
  id             uuid primary key default gen_random_uuid(),
  -- Presentation/routing identifier only. NEVER used for authorization.
  slug           text not null unique
                 check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 64),
  -- Optional relationship name ("John & Kath"). When null the UI derives one
  -- from the partners' display names.
  name           text check (name is null or char_length(btrim(name)) between 1 and 80),
  display_title  text not null default 'Our Little World'
                 check (char_length(btrim(display_title)) between 1 and 80),
  description    text check (description is null or char_length(description) <= 500),
  story_began_on date,
  cover_path     text,
  created_by     uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- Soft delete. A deleted couple is invisible to everyone (see
  -- private.is_couple_member). Hard purge is a separate, offline admin task.
  deleted_at     timestamptz,
  constraint couples_cover_path_scoped check (
    cover_path is null
    or cover_path ~ ('^couples/' || id::text || '/cover/[0-9a-f-]{36}\.(jpg|png|webp|gif|avif)$')
  )
);

create trigger couples_set_updated_at
  before update on public.couples
  for each row execute function private.set_updated_at();

create trigger couples_guard_immutable
  before update on public.couples
  for each row execute function private.guard_immutable_columns('id', 'slug', 'created_by', 'created_at');

-- -----------------------------------------------------------------------------
-- couple_members  (users <-> couples; a user may belong to many couples)
-- -----------------------------------------------------------------------------

create table public.couple_members (
  couple_id   uuid not null references public.couples (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        text not null default 'partner' check (role in ('creator', 'partner')),
  -- Per-space avatar, stored under this couple's storage prefix.
  avatar_path text,
  joined_at   timestamptz not null default now(),
  primary key (couple_id, user_id),
  constraint couple_members_avatar_path_scoped check (
    avatar_path is null
    or avatar_path ~ ('^couples/' || couple_id::text || '/avatars/' || user_id::text
                      || '/[0-9a-f-]{36}\.(jpg|png|webp|gif|avif)$')
  )
);

create index couple_members_user_id_idx on public.couple_members (user_id);

create trigger couple_members_guard_immutable
  before update on public.couple_members
  for each row execute function private.guard_immutable_columns('couple_id', 'user_id', 'role', 'joined_at');

-- A couple consists of exactly two people. Lock the couple row so concurrent
-- invitation acceptances serialize, then count.
create or replace function private.enforce_couple_member_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.couples where id = new.couple_id for update;

  if (select count(*) from public.couple_members where couple_id = new.couple_id) >= 2 then
    raise exception 'couple_full'
      using detail = 'This space already has two members.';
  end if;

  return new;
end;
$$;

create trigger couple_members_enforce_limit
  before insert on public.couple_members
  for each row execute function private.enforce_couple_member_limit();

-- -----------------------------------------------------------------------------
-- couple_invitations
-- -----------------------------------------------------------------------------

create table public.couple_invitations (
  id                     uuid primary key default gen_random_uuid(),
  couple_id              uuid not null references public.couples (id) on delete cascade,
  invited_email          text not null check (
                           invited_email = lower(btrim(invited_email))
                           and invited_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
                           and char_length(invited_email) <= 254
                         ),
  invited_by             uuid references auth.users (id) on delete set null,
  -- SHA-256 hex of the raw token. The raw token only ever exists in the
  -- invitation link. Rotated on resend, which invalidates the previous link.
  token_hash             text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at             timestamptz not null,
  accepted_at            timestamptz,
  accepted_by            uuid references auth.users (id) on delete set null,
  cancelled_at           timestamptz,
  cancelled_by           uuid references auth.users (id) on delete set null,
  -- Resend rate limiting (enforced in public.resend_couple_invitation).
  last_sent_at           timestamptz not null default now(),
  send_window_started_at timestamptz not null default now(),
  sends_in_window        integer not null default 1 check (sends_in_window >= 0),
  created_at             timestamptz not null default now(),
  constraint couple_invitations_single_outcome check (accepted_at is null or cancelled_at is null)
);

-- At most one open invitation per couple.
create unique index couple_invitations_one_open_per_couple
  on public.couple_invitations (couple_id)
  where accepted_at is null and cancelled_at is null;

create index couple_invitations_invited_email_idx
  on public.couple_invitations (invited_email)
  where accepted_at is null and cancelled_at is null;

create trigger couple_invitations_guard_immutable
  before update on public.couple_invitations
  for each row execute function private.guard_immutable_columns('couple_id', 'invited_email', 'invited_by', 'created_at');

-- -----------------------------------------------------------------------------
-- couple_themes  (one row per couple)
-- -----------------------------------------------------------------------------

create table public.couple_themes (
  couple_id        uuid primary key references public.couples (id) on delete cascade,
  name             text not null default 'paper'
                   check (name in ('paper', 'linen', 'blush', 'sage', 'midnight')),
  primary_color    text not null default '#b4553d' check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  background_color text not null default '#f6f0e6' check (background_color ~ '^#[0-9a-fA-F]{6}$'),
  card_style       text not null default 'soft'
                   check (card_style in ('soft', 'flat', 'outlined', 'elevated')),
  typography       text not null default 'editorial'
                   check (typography in ('editorial', 'modern', 'classic', 'handwritten')),
  background_style text not null default 'paper'
                   check (background_style in ('plain', 'paper', 'grain', 'gradient')),
  layout           text not null default 'comfortable'
                   check (layout in ('comfortable', 'compact')),
  updated_at       timestamptz not null default now()
);

create trigger couple_themes_set_updated_at
  before update on public.couple_themes
  for each row execute function private.set_updated_at();

create trigger couple_themes_guard_immutable
  before update on public.couple_themes
  for each row execute function private.guard_immutable_columns('couple_id');

-- -----------------------------------------------------------------------------
-- journals  (COUPLE-OWNED)
-- -----------------------------------------------------------------------------

create table public.journals (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  title      text not null check (char_length(btrim(title)) between 1 and 160),
  body       text check (body is null or char_length(body) <= 50000),
  entry_date date not null default current_date,
  mood       text check (mood is null or char_length(mood) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, couple_id)
);

create index journals_couple_entry_date_idx on public.journals (couple_id, entry_date desc);

create trigger journals_set_updated_at
  before update on public.journals
  for each row execute function private.set_updated_at();

create trigger journals_guard_immutable
  before update on public.journals
  for each row execute function private.guard_immutable_columns('couple_id', 'created_by', 'created_at');

-- -----------------------------------------------------------------------------
-- journal_reflections  (USER-OWNED when private, RELATIONSHIP-CONTROLLED when shared)
-- -----------------------------------------------------------------------------

create table public.journal_reflections (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples (id) on delete cascade,
  journal_id uuid not null,
  author_id  uuid not null,
  visibility text not null default 'shared' check (visibility in ('private', 'shared')),
  body       text not null check (char_length(btrim(body)) between 1 and 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (journal_id, couple_id) references public.journals (id, couple_id) on delete cascade,
  foreign key (couple_id, author_id) references public.couple_members (couple_id, user_id) on delete cascade
);

create index journal_reflections_journal_idx on public.journal_reflections (journal_id);
create index journal_reflections_couple_author_idx on public.journal_reflections (couple_id, author_id);

create trigger journal_reflections_set_updated_at
  before update on public.journal_reflections
  for each row execute function private.set_updated_at();

create trigger journal_reflections_guard_immutable
  before update on public.journal_reflections
  for each row execute function private.guard_immutable_columns('couple_id', 'journal_id', 'author_id', 'created_at');

-- -----------------------------------------------------------------------------
-- journal_photos  (COUPLE-OWNED)
-- -----------------------------------------------------------------------------

create table public.journal_photos (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references public.couples (id) on delete cascade,
  journal_id   uuid not null,
  uploaded_by  uuid references auth.users (id) on delete set null,
  storage_path text not null unique,
  content_type text not null check (content_type in (
                 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'
               )),
  size_bytes   integer check (size_bytes is null or size_bytes > 0),
  caption      text check (caption is null or char_length(caption) <= 500),
  created_at   timestamptz not null default now(),
  foreign key (journal_id, couple_id) references public.journals (id, couple_id) on delete cascade,
  constraint journal_photos_path_scoped check (
    storage_path ~ ('^couples/' || couple_id::text || '/journals/' || journal_id::text
                    || '/[0-9a-f-]{36}\.(jpg|png|webp|gif|avif)$')
  )
);

create index journal_photos_journal_idx on public.journal_photos (journal_id, created_at);
create index journal_photos_couple_created_idx on public.journal_photos (couple_id, created_at desc);

create trigger journal_photos_guard_immutable
  before update on public.journal_photos
  for each row execute function private.guard_immutable_columns(
    'couple_id', 'journal_id', 'uploaded_by', 'storage_path', 'content_type', 'size_bytes', 'created_at'
  );

-- -----------------------------------------------------------------------------
-- places + place_journals  (COUPLE-OWNED)
-- -----------------------------------------------------------------------------

create table public.places (
  id               uuid primary key default gen_random_uuid(),
  couple_id        uuid not null references public.couples (id) on delete cascade,
  created_by       uuid references auth.users (id) on delete set null,
  name             text not null check (char_length(btrim(name)) between 1 and 160),
  description      text check (description is null or char_length(description) <= 5000),
  address          text check (address is null or char_length(address) <= 300),
  latitude         double precision check (latitude is null or latitude between -90 and 90),
  longitude        double precision check (longitude is null or longitude between -180 and 180),
  category         text not null default 'other'
                   check (category in ('home', 'food', 'travel', 'nature', 'culture', 'nightlife', 'other')),
  status           text not null default 'visited' check (status in ('visited', 'wishlist')),
  first_visited_on date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (id, couple_id)
);

create index places_couple_idx on public.places (couple_id, created_at desc);

create trigger places_set_updated_at
  before update on public.places
  for each row execute function private.set_updated_at();

create trigger places_guard_immutable
  before update on public.places
  for each row execute function private.guard_immutable_columns('couple_id', 'created_by', 'created_at');

create table public.place_journals (
  couple_id  uuid not null references public.couples (id) on delete cascade,
  place_id   uuid not null,
  journal_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (place_id, journal_id),
  foreign key (place_id, couple_id) references public.places (id, couple_id) on delete cascade,
  foreign key (journal_id, couple_id) references public.journals (id, couple_id) on delete cascade
);

create index place_journals_journal_idx on public.place_journals (journal_id);

-- -----------------------------------------------------------------------------
-- events  (COUPLE-OWNED)
-- -----------------------------------------------------------------------------

create table public.events (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  created_by  uuid references auth.users (id) on delete set null,
  title       text not null check (char_length(btrim(title)) between 1 and 160),
  description text check (description is null or char_length(description) <= 5000),
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  all_day     boolean not null default false,
  location    text check (location is null or char_length(location) <= 200),
  place_id    uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint events_valid_range check (ends_at is null or ends_at >= starts_at),
  foreign key (place_id, couple_id) references public.places (id, couple_id) on delete set null (place_id)
);

create index events_couple_starts_idx on public.events (couple_id, starts_at);

create trigger events_set_updated_at
  before update on public.events
  for each row execute function private.set_updated_at();

create trigger events_guard_immutable
  before update on public.events
  for each row execute function private.guard_immutable_columns('couple_id', 'created_by', 'created_at');

-- -----------------------------------------------------------------------------
-- milestones  (COUPLE-OWNED)
-- -----------------------------------------------------------------------------

create table public.milestones (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  created_by  uuid references auth.users (id) on delete set null,
  title       text not null check (char_length(btrim(title)) between 1 and 160),
  description text check (description is null or char_length(description) <= 5000),
  occurred_on date not null,
  icon        text not null default 'heart'
              check (icon in ('heart', 'star', 'home', 'ring', 'plane', 'gift', 'sparkles', 'flag')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index milestones_couple_occurred_idx on public.milestones (couple_id, occurred_on desc);

create trigger milestones_set_updated_at
  before update on public.milestones
  for each row execute function private.set_updated_at();

create trigger milestones_guard_immutable
  before update on public.milestones
  for each row execute function private.guard_immutable_columns('couple_id', 'created_by', 'created_at');

-- -----------------------------------------------------------------------------
-- notes  (USER-OWNED when private, RELATIONSHIP-CONTROLLED when shared)
-- -----------------------------------------------------------------------------

create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples (id) on delete cascade,
  author_id  uuid not null,
  visibility text not null default 'private' check (visibility in ('private', 'shared')),
  title      text check (title is null or char_length(title) <= 160),
  body       text not null check (char_length(btrim(body)) between 1 and 20000),
  pinned     boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (couple_id, author_id) references public.couple_members (couple_id, user_id) on delete cascade
);

create index notes_couple_author_idx on public.notes (couple_id, author_id);

create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function private.set_updated_at();

create trigger notes_guard_immutable
  before update on public.notes
  for each row execute function private.guard_immutable_columns('couple_id', 'author_id', 'created_at');

-- -----------------------------------------------------------------------------
-- letters + letter_contents  (USER-OWNED by the author)
--
-- The sealed content lives in its own table so that RLS — not the UI — decides
-- whether it can be read. The recipient can always see the envelope (letters
-- row: author, title, unlock_at) but letter_contents is only readable by the
-- recipient once unlock_at has passed (database clock, not client clock).
-- -----------------------------------------------------------------------------

create table public.letters (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references public.couples (id) on delete cascade,
  author_id    uuid not null,
  recipient_id uuid not null,
  -- The "envelope" line. Visible to the recipient before the letter unlocks.
  title        text not null check (char_length(btrim(title)) between 1 and 160),
  unlock_at    timestamptz not null,
  opened_at    timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (id, couple_id),
  constraint letters_distinct_people check (author_id <> recipient_id),
  foreign key (couple_id, author_id) references public.couple_members (couple_id, user_id) on delete cascade,
  foreign key (couple_id, recipient_id) references public.couple_members (couple_id, user_id) on delete cascade
);

create index letters_couple_unlock_idx on public.letters (couple_id, unlock_at);

create trigger letters_set_updated_at
  before update on public.letters
  for each row execute function private.set_updated_at();

create trigger letters_guard_immutable
  before update on public.letters
  for each row execute function private.guard_immutable_columns('couple_id', 'author_id', 'recipient_id', 'created_at');

create table public.letter_contents (
  letter_id  uuid primary key,
  couple_id  uuid not null references public.couples (id) on delete cascade,
  content    text not null check (char_length(btrim(content)) between 1 and 50000),
  updated_at timestamptz not null default now(),
  foreign key (letter_id, couple_id) references public.letters (id, couple_id) on delete cascade
);

create trigger letter_contents_set_updated_at
  before update on public.letter_contents
  for each row execute function private.set_updated_at();

create trigger letter_contents_guard_immutable
  before update on public.letter_contents
  for each row execute function private.guard_immutable_columns('letter_id', 'couple_id');
