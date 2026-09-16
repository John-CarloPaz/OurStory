-- =============================================================================
-- Our Story :: 0200 row level security + privileges
--
-- The rule underneath every policy:
--
--   exists (select 1 from couple_members cm
--           where cm.couple_id = <row>.couple_id and cm.user_id = auth.uid())
--
-- implemented once in private.is_couple_member(). It is SECURITY DEFINER so it
-- can read couple_members without recursing through couple_members' own RLS,
-- and it treats soft-deleted couples as having no members.
--
-- Privileges are granted explicitly (least privilege) instead of relying on
-- Supabase's default "grant all to anon, authenticated". anon gets nothing on
-- any table; the only anonymous entry point is get_invitation_preview().
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Membership helpers
-- -----------------------------------------------------------------------------

create or replace function private.is_couple_member(p_couple_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.couple_members cm
    join public.couples c on c.id = cm.couple_id
    where cm.couple_id = p_couple_id
      and cm.user_id = (select auth.uid())
      and c.deleted_at is null
  );
$$;

-- True when the current user and p_user_id are both members of some live couple.
create or replace function private.shares_couple_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.couple_members me
    join public.couple_members them on them.couple_id = me.couple_id
    join public.couples c on c.id = me.couple_id
    where me.user_id = (select auth.uid())
      and them.user_id = p_user_id
      and c.deleted_at is null
  );
$$;

revoke all on all functions in schema private from public;
grant execute on all functions in schema private to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Enable RLS everywhere
-- -----------------------------------------------------------------------------

alter table public.profiles            enable row level security;
alter table public.couples             enable row level security;
alter table public.couple_members      enable row level security;
alter table public.couple_invitations  enable row level security;
alter table public.couple_themes       enable row level security;
alter table public.journals            enable row level security;
alter table public.journal_reflections enable row level security;
alter table public.journal_photos      enable row level security;
alter table public.places              enable row level security;
alter table public.place_journals      enable row level security;
alter table public.events              enable row level security;
alter table public.milestones          enable row level security;
alter table public.notes               enable row level security;
alter table public.letters             enable row level security;
alter table public.letter_contents     enable row level security;

-- -----------------------------------------------------------------------------
-- Privileges: revoke the platform defaults, then grant exactly what is used.
-- -----------------------------------------------------------------------------

revoke all on
  public.profiles, public.couples, public.couple_members, public.couple_invitations,
  public.couple_themes, public.journals, public.journal_reflections, public.journal_photos,
  public.places, public.place_journals, public.events, public.milestones, public.notes,
  public.letters, public.letter_contents
from anon, authenticated;

grant all on
  public.profiles, public.couples, public.couple_members, public.couple_invitations,
  public.couple_themes, public.journals, public.journal_reflections, public.journal_photos,
  public.places, public.place_journals, public.events, public.milestones, public.notes,
  public.letters, public.letter_contents
to service_role;

-- profiles: your own row is writable; partners' rows are readable.
grant select on public.profiles to authenticated;
grant insert (id, display_name, birthday) on public.profiles to authenticated;
grant update (display_name, birthday) on public.profiles to authenticated;

-- couples: created/deleted only through RPCs; identity fields editable by members.
grant select on public.couples to authenticated;
grant update (name, display_title, description, story_began_on, cover_path) on public.couples to authenticated;

-- couple_members: created only through RPCs; you may change your own avatar.
grant select on public.couple_members to authenticated;
grant update (avatar_path) on public.couple_members to authenticated;

-- couple_invitations: read-only for members, and token_hash is NOT readable.
grant select (
  id, couple_id, invited_email, invited_by, expires_at, accepted_at, accepted_by,
  cancelled_at, cancelled_by, last_sent_at, sends_in_window, created_at
) on public.couple_invitations to authenticated;

-- couple_themes: created by create_couple(); appearance editable by members.
grant select on public.couple_themes to authenticated;
grant update (name, primary_color, background_color, card_style, typography, background_style, layout)
  on public.couple_themes to authenticated;

-- Content tables
grant select, insert, update, delete on
  public.journals, public.journal_reflections, public.places, public.events,
  public.milestones, public.notes
to authenticated;

grant select, insert, delete on public.journal_photos to authenticated;
grant update (caption) on public.journal_photos to authenticated;

grant select, insert, delete on public.place_journals to authenticated;

grant select, insert, delete on public.letters to authenticated;
grant update (title, unlock_at) on public.letters to authenticated;
grant select, insert, update (content), delete on public.letter_contents to authenticated;

-- =============================================================================
-- Policies
-- =============================================================================

-- profiles --------------------------------------------------------------------

create policy profiles_select_self_or_partner on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or private.shares_couple_with(id));

create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- couples ---------------------------------------------------------------------

create policy couples_select_member on public.couples
  for select to authenticated
  using (private.is_couple_member(id));

create policy couples_update_member on public.couples
  for update to authenticated
  using (private.is_couple_member(id))
  with check (private.is_couple_member(id));

-- couple_members --------------------------------------------------------------

create policy couple_members_select_member on public.couple_members
  for select to authenticated
  using (private.is_couple_member(couple_id));

create policy couple_members_update_own on public.couple_members
  for update to authenticated
  using (user_id = (select auth.uid()) and private.is_couple_member(couple_id))
  with check (user_id = (select auth.uid()) and private.is_couple_member(couple_id));

-- couple_invitations ----------------------------------------------------------

create policy couple_invitations_select_member on public.couple_invitations
  for select to authenticated
  using (private.is_couple_member(couple_id));

-- couple_themes ---------------------------------------------------------------

create policy couple_themes_select_member on public.couple_themes
  for select to authenticated
  using (private.is_couple_member(couple_id));

create policy couple_themes_update_member on public.couple_themes
  for update to authenticated
  using (private.is_couple_member(couple_id))
  with check (private.is_couple_member(couple_id));

-- Couple-owned content: any member of the couple has full access. ---------------

create policy journals_select_member on public.journals
  for select to authenticated using (private.is_couple_member(couple_id));
create policy journals_insert_member on public.journals
  for insert to authenticated
  with check (private.is_couple_member(couple_id) and created_by = (select auth.uid()));
create policy journals_update_member on public.journals
  for update to authenticated
  using (private.is_couple_member(couple_id)) with check (private.is_couple_member(couple_id));
create policy journals_delete_member on public.journals
  for delete to authenticated using (private.is_couple_member(couple_id));

create policy journal_photos_select_member on public.journal_photos
  for select to authenticated using (private.is_couple_member(couple_id));
create policy journal_photos_insert_member on public.journal_photos
  for insert to authenticated
  with check (private.is_couple_member(couple_id) and uploaded_by = (select auth.uid()));
create policy journal_photos_update_member on public.journal_photos
  for update to authenticated
  using (private.is_couple_member(couple_id)) with check (private.is_couple_member(couple_id));
create policy journal_photos_delete_member on public.journal_photos
  for delete to authenticated using (private.is_couple_member(couple_id));

create policy places_select_member on public.places
  for select to authenticated using (private.is_couple_member(couple_id));
create policy places_insert_member on public.places
  for insert to authenticated
  with check (private.is_couple_member(couple_id) and created_by = (select auth.uid()));
create policy places_update_member on public.places
  for update to authenticated
  using (private.is_couple_member(couple_id)) with check (private.is_couple_member(couple_id));
create policy places_delete_member on public.places
  for delete to authenticated using (private.is_couple_member(couple_id));

create policy place_journals_select_member on public.place_journals
  for select to authenticated using (private.is_couple_member(couple_id));
create policy place_journals_insert_member on public.place_journals
  for insert to authenticated with check (private.is_couple_member(couple_id));
create policy place_journals_delete_member on public.place_journals
  for delete to authenticated using (private.is_couple_member(couple_id));

create policy events_select_member on public.events
  for select to authenticated using (private.is_couple_member(couple_id));
create policy events_insert_member on public.events
  for insert to authenticated
  with check (private.is_couple_member(couple_id) and created_by = (select auth.uid()));
create policy events_update_member on public.events
  for update to authenticated
  using (private.is_couple_member(couple_id)) with check (private.is_couple_member(couple_id));
create policy events_delete_member on public.events
  for delete to authenticated using (private.is_couple_member(couple_id));

create policy milestones_select_member on public.milestones
  for select to authenticated using (private.is_couple_member(couple_id));
create policy milestones_insert_member on public.milestones
  for insert to authenticated
  with check (private.is_couple_member(couple_id) and created_by = (select auth.uid()));
create policy milestones_update_member on public.milestones
  for update to authenticated
  using (private.is_couple_member(couple_id)) with check (private.is_couple_member(couple_id));
create policy milestones_delete_member on public.milestones
  for delete to authenticated using (private.is_couple_member(couple_id));

-- Private-or-shared content: tenant isolation AND content privacy. -----------------
--   private -> member of couple AND author
--   shared  -> member of couple AND visibility = 'shared'
-- Only the author may write.

create policy journal_reflections_select on public.journal_reflections
  for select to authenticated
  using (
    private.is_couple_member(couple_id)
    and (author_id = (select auth.uid()) or visibility = 'shared')
  );
create policy journal_reflections_insert_author on public.journal_reflections
  for insert to authenticated
  with check (private.is_couple_member(couple_id) and author_id = (select auth.uid()));
create policy journal_reflections_update_author on public.journal_reflections
  for update to authenticated
  using (private.is_couple_member(couple_id) and author_id = (select auth.uid()))
  with check (private.is_couple_member(couple_id) and author_id = (select auth.uid()));
create policy journal_reflections_delete_author on public.journal_reflections
  for delete to authenticated
  using (private.is_couple_member(couple_id) and author_id = (select auth.uid()));

create policy notes_select on public.notes
  for select to authenticated
  using (
    private.is_couple_member(couple_id)
    and (author_id = (select auth.uid()) or visibility = 'shared')
  );
create policy notes_insert_author on public.notes
  for insert to authenticated
  with check (private.is_couple_member(couple_id) and author_id = (select auth.uid()));
create policy notes_update_author on public.notes
  for update to authenticated
  using (private.is_couple_member(couple_id) and author_id = (select auth.uid()))
  with check (private.is_couple_member(couple_id) and author_id = (select auth.uid()));
create policy notes_delete_author on public.notes
  for delete to authenticated
  using (private.is_couple_member(couple_id) and author_id = (select auth.uid()));

-- Letters ------------------------------------------------------------------------
-- Envelope (letters): visible to author and recipient.
-- Only the author edits, and only while the letter is still sealed.
-- opened_at is set through public.mark_letter_opened().

create policy letters_select_participants on public.letters
  for select to authenticated
  using (
    private.is_couple_member(couple_id)
    and (author_id = (select auth.uid()) or recipient_id = (select auth.uid()))
  );
create policy letters_insert_author on public.letters
  for insert to authenticated
  with check (private.is_couple_member(couple_id) and author_id = (select auth.uid()));
create policy letters_update_author_while_sealed on public.letters
  for update to authenticated
  using (
    private.is_couple_member(couple_id)
    and author_id = (select auth.uid())
    and unlock_at > now()
  )
  with check (private.is_couple_member(couple_id) and author_id = (select auth.uid()));
create policy letters_delete_author on public.letters
  for delete to authenticated
  using (private.is_couple_member(couple_id) and author_id = (select auth.uid()));

-- Sealed content: the author always; the recipient only once unlock_at <= now().
create policy letter_contents_select on public.letter_contents
  for select to authenticated
  using (
    private.is_couple_member(couple_id)
    and exists (
      select 1 from public.letters l
      where l.id = letter_contents.letter_id
        and (
          l.author_id = (select auth.uid())
          or (l.recipient_id = (select auth.uid()) and l.unlock_at <= now())
        )
    )
  );
create policy letter_contents_insert_author on public.letter_contents
  for insert to authenticated
  with check (
    private.is_couple_member(couple_id)
    and exists (
      select 1 from public.letters l
      where l.id = letter_contents.letter_id and l.author_id = (select auth.uid())
    )
  );
create policy letter_contents_update_author_while_sealed on public.letter_contents
  for update to authenticated
  using (
    private.is_couple_member(couple_id)
    and exists (
      select 1 from public.letters l
      where l.id = letter_contents.letter_id
        and l.author_id = (select auth.uid())
        and l.unlock_at > now()
    )
  )
  with check (private.is_couple_member(couple_id));
create policy letter_contents_delete_author on public.letter_contents
  for delete to authenticated
  using (
    private.is_couple_member(couple_id)
    and exists (
      select 1 from public.letters l
      where l.id = letter_contents.letter_id and l.author_id = (select auth.uid())
    )
  );
