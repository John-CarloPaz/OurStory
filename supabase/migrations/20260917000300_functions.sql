-- =============================================================================
-- Our Story :: 0300 RPC functions
--
-- Multi-row operations that must be atomic, or that need to act before the
-- caller is a member (creating a couple, accepting an invitation), live here.
--
-- Conventions
--   * SECURITY DEFINER functions re-derive the caller from auth.uid() and
--     re-check membership themselves. They never trust a couple_id without
--     verifying the caller belongs to it.
--   * Errors are raised as a stable machine code in the message
--     (e.g. 'invitation_expired'); the app maps codes to user-facing copy.
--   * search_path is pinned to '' and every object is schema-qualified.
--   * Raw invitation tokens are accepted as arguments only to be hashed; token
--     hashes supplied on create/resend are generated server-side by the app.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Internal helpers
-- -----------------------------------------------------------------------------

create or replace function private.invitation_ttl(p_days integer)
returns interval
language sql
immutable
set search_path = ''
as $$
  select make_interval(days => least(greatest(coalesce(p_days, 7), 1), 30));
$$;

create or replace function private.normalize_email(p_email text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if char_length(v_email) > 254 or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'invalid_email';
  end if;
  return v_email;
end;
$$;

create or replace function private.assert_token_hash(p_token_hash text)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_token_hash';
  end if;
end;
$$;

-- Human label for a couple, used in invitation copy.
create or replace function private.couple_label(p_couple_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    c.name,
    (select string_agg(p.display_name, ' & ' order by cm.joined_at)
       from public.couple_members cm
       join public.profiles p on p.id = cm.user_id
      where cm.couple_id = c.id),
    'Our Story'
  )
  from public.couples c
  where c.id = p_couple_id;
$$;

revoke all on all functions in schema private from public;
grant execute on all functions in schema private to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- create_couple: onboarding. Profile + couple + membership + theme + invitation.
-- -----------------------------------------------------------------------------

create or replace function public.create_couple(
  p_creator_name      text,
  p_partner_email     text,
  p_invite_token_hash text,
  p_couple_name       text default null,
  p_story_began_on    date default null,
  p_invite_ttl_days   integer default 7
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid           uuid := auth.uid();
  v_user_email    text;
  v_creator_name  text := btrim(coalesce(p_creator_name, ''));
  v_couple_name   text := nullif(btrim(coalesce(p_couple_name, '')), '');
  v_partner_email text;
  v_couple_id     uuid;
  v_invitation_id uuid;
  v_expires_at    timestamptz;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select lower(email) into v_user_email from auth.users where id = v_uid;

  if char_length(v_creator_name) not between 1 and 60 then
    raise exception 'invalid_name';
  end if;
  if v_couple_name is not null and char_length(v_couple_name) > 80 then
    raise exception 'invalid_couple_name';
  end if;

  v_partner_email := private.normalize_email(p_partner_email);
  if v_partner_email = v_user_email then
    raise exception 'cannot_invite_self';
  end if;

  perform private.assert_token_hash(p_invite_token_hash);

  if (select count(*)
        from public.couple_members cm
        join public.couples c on c.id = cm.couple_id
       where cm.user_id = v_uid and c.deleted_at is null) >= 5 then
    raise exception 'membership_limit_reached';
  end if;

  if (select count(*) from public.couples
       where created_by = v_uid and created_at > now() - interval '24 hours') >= 3 then
    raise exception 'rate_limited';
  end if;

  insert into public.profiles (id, display_name)
  values (v_uid, v_creator_name)
  on conflict (id) do update set display_name = excluded.display_name;

  insert into public.couples (slug, name, story_began_on, created_by)
  values (
    private.slugify(coalesce(v_couple_name, v_creator_name))
      || '-' || left(replace(gen_random_uuid()::text, '-', ''), 8),
    v_couple_name,
    p_story_began_on,
    v_uid
  )
  returning id into v_couple_id;

  insert into public.couple_members (couple_id, user_id, role)
  values (v_couple_id, v_uid, 'creator');

  insert into public.couple_themes (couple_id) values (v_couple_id);

  v_expires_at := now() + private.invitation_ttl(p_invite_ttl_days);

  insert into public.couple_invitations (couple_id, invited_email, invited_by, token_hash, expires_at)
  values (v_couple_id, v_partner_email, v_uid, p_invite_token_hash, v_expires_at)
  returning id into v_invitation_id;

  return jsonb_build_object(
    'couple_id',     v_couple_id,
    'invitation_id', v_invitation_id,
    'invited_email', v_partner_email,
    'expires_at',    v_expires_at,
    'inviter_name',  v_creator_name,
    'couple_label',  coalesce(v_couple_name, v_creator_name)
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- get_invitation_preview: the only anonymous entry point.
-- Returns just enough to render the invitation page for the token holder.
-- -----------------------------------------------------------------------------

create or replace function public.get_invitation_preview(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid         uuid := auth.uid();
  v_inv         public.couple_invitations%rowtype;
  v_couple      public.couples%rowtype;
  v_member_cnt  integer;
  v_inviter     text;
  v_viewer_mail text;
  v_status      text;
begin
  if p_token is null or char_length(p_token) not between 32 and 128 then
    return jsonb_build_object('status', 'not_found');
  end if;

  select * into v_inv
    from public.couple_invitations
   where token_hash = private.hash_invitation_token(p_token);

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  select * into v_couple from public.couples where id = v_inv.couple_id;
  select count(*) into v_member_cnt from public.couple_members where couple_id = v_inv.couple_id;
  select display_name into v_inviter from public.profiles where id = v_inv.invited_by;

  if v_uid is not null then
    select lower(email) into v_viewer_mail from auth.users where id = v_uid;
  end if;

  v_status := case
    when v_couple.id is null or v_couple.deleted_at is not null then 'unavailable'
    when v_uid is not null and exists (
      select 1 from public.couple_members
       where couple_id = v_inv.couple_id and user_id = v_uid
    ) then 'already_member'
    when v_inv.cancelled_at is not null then 'cancelled'
    when v_inv.accepted_at is not null then 'accepted'
    when v_member_cnt >= 2 then 'full'
    when v_inv.expires_at <= now() then 'expired'
    else 'valid'
  end;

  if v_status <> 'valid' then
    return jsonb_build_object(
      'status',       v_status,
      'inviter_name', case when v_status in ('expired', 'already_member') then v_inviter end
    );
  end if;

  return jsonb_build_object(
    'status',               'valid',
    'inviter_name',         coalesce(v_inviter, 'Your partner'),
    'couple_label',         private.couple_label(v_inv.couple_id),
    'display_title',        v_couple.display_title,
    'invited_email',        v_inv.invited_email,
    'expires_at',           v_inv.expires_at,
    'viewer_email_matches', case when v_uid is null then null else v_viewer_mail = v_inv.invited_email end
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- accept_couple_invitation
-- -----------------------------------------------------------------------------

create or replace function public.accept_couple_invitation(
  p_token        text,
  p_display_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid        uuid := auth.uid();
  v_user       auth.users%rowtype;
  v_inv        public.couple_invitations%rowtype;
  v_name       text := nullif(btrim(coalesce(p_display_name, '')), '');
  v_member_cnt integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_token is null or char_length(p_token) not between 32 and 128 then
    raise exception 'invitation_not_found';
  end if;
  if v_name is not null and char_length(v_name) > 60 then
    raise exception 'invalid_name';
  end if;

  select * into v_user from auth.users where id = v_uid;

  -- Email ownership must be proven before joining someone's space.
  if v_user.email_confirmed_at is null then
    raise exception 'email_not_confirmed';
  end if;

  select * into v_inv
    from public.couple_invitations
   where token_hash = private.hash_invitation_token(p_token)
   for update;

  if not found then
    raise exception 'invitation_not_found';
  end if;

  -- The invitation is bound to one email address.
  if lower(v_user.email) <> v_inv.invited_email then
    raise exception 'invitation_email_mismatch';
  end if;

  if v_inv.cancelled_at is not null then
    raise exception 'invitation_cancelled';
  end if;

  if v_inv.accepted_at is not null then
    -- Idempotent for the person who already accepted it (double submit).
    if v_inv.accepted_by = v_uid and exists (
      select 1 from public.couple_members where couple_id = v_inv.couple_id and user_id = v_uid
    ) then
      return jsonb_build_object('couple_id', v_inv.couple_id);
    end if;
    raise exception 'invitation_already_accepted';
  end if;

  if v_inv.expires_at <= now() then
    raise exception 'invitation_expired';
  end if;

  -- Lock the tenant so the two-member check cannot race.
  perform 1 from public.couples where id = v_inv.couple_id and deleted_at is null for update;
  if not found then
    raise exception 'couple_unavailable';
  end if;

  if exists (select 1 from public.couple_members where couple_id = v_inv.couple_id and user_id = v_uid) then
    update public.couple_invitations
       set accepted_at = now(), accepted_by = v_uid
     where id = v_inv.id;
    return jsonb_build_object('couple_id', v_inv.couple_id);
  end if;

  select count(*) into v_member_cnt from public.couple_members where couple_id = v_inv.couple_id;
  if v_member_cnt >= 2 then
    raise exception 'couple_full';
  end if;

  if (select count(*)
        from public.couple_members cm
        join public.couples c on c.id = cm.couple_id
       where cm.user_id = v_uid and c.deleted_at is null) >= 5 then
    raise exception 'membership_limit_reached';
  end if;

  insert into public.profiles (id, display_name)
  values (
    v_uid,
    left(coalesce(
      v_name,
      nullif(btrim(v_user.raw_user_meta_data ->> 'display_name'), ''),
      split_part(v_user.email, '@', 1)
    ), 60)
  )
  on conflict (id) do update
    set display_name = coalesce(v_name, public.profiles.display_name);

  insert into public.couple_members (couple_id, user_id, role)
  values (v_inv.couple_id, v_uid, 'partner');

  update public.couple_invitations
     set accepted_at = now(), accepted_by = v_uid
   where id = v_inv.id;

  return jsonb_build_object('couple_id', v_inv.couple_id);
end;
$$;

-- -----------------------------------------------------------------------------
-- create_couple_invitation: invite (or re-invite a different email) from settings.
-- Any existing open invitation for the couple is cancelled first.
-- -----------------------------------------------------------------------------

create or replace function public.create_couple_invitation(
  p_couple_id     uuid,
  p_invited_email text,
  p_token_hash    text,
  p_ttl_days      integer default 7
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid           uuid := auth.uid();
  v_email         text;
  v_invitation_id uuid;
  v_expires_at    timestamptz;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not private.is_couple_member(p_couple_id) then
    raise exception 'couple_not_found';
  end if;

  v_email := private.normalize_email(p_invited_email);
  perform private.assert_token_hash(p_token_hash);

  perform 1 from public.couples where id = p_couple_id for update;

  if (select count(*) from public.couple_members where couple_id = p_couple_id) >= 2 then
    raise exception 'couple_full';
  end if;

  if exists (
    select 1 from public.couple_members cm
      join auth.users u on u.id = cm.user_id
     where cm.couple_id = p_couple_id and lower(u.email) = v_email
  ) then
    raise exception 'cannot_invite_member';
  end if;

  if (select count(*) from public.couple_invitations
       where couple_id = p_couple_id and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'rate_limited';
  end if;

  update public.couple_invitations
     set cancelled_at = now(), cancelled_by = v_uid
   where couple_id = p_couple_id and accepted_at is null and cancelled_at is null;

  v_expires_at := now() + private.invitation_ttl(p_ttl_days);

  insert into public.couple_invitations (couple_id, invited_email, invited_by, token_hash, expires_at)
  values (p_couple_id, v_email, v_uid, p_token_hash, v_expires_at)
  returning id into v_invitation_id;

  return jsonb_build_object(
    'invitation_id', v_invitation_id,
    'invited_email', v_email,
    'expires_at',    v_expires_at,
    'inviter_name',  (select display_name from public.profiles where id = v_uid),
    'couple_label',  private.couple_label(p_couple_id)
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- resend_couple_invitation: rotates the token (old link dies), renews expiry.
-- Rate limited: at least 60 seconds apart and at most 5 sends per 24 hours.
-- -----------------------------------------------------------------------------

create or replace function public.resend_couple_invitation(
  p_invitation_id uuid,
  p_token_hash    text,
  p_ttl_days      integer default 7
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid        uuid := auth.uid();
  v_inv        public.couple_invitations%rowtype;
  v_window_at  timestamptz;
  v_sends      integer;
  v_expires_at timestamptz;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  perform private.assert_token_hash(p_token_hash);

  select * into v_inv from public.couple_invitations where id = p_invitation_id for update;

  -- Non-members get the same answer as a missing invitation.
  if not found or not private.is_couple_member(v_inv.couple_id) then
    raise exception 'invitation_not_found';
  end if;
  if v_inv.accepted_at is not null then
    raise exception 'invitation_already_accepted';
  end if;
  if v_inv.cancelled_at is not null then
    raise exception 'invitation_cancelled';
  end if;
  if (select count(*) from public.couple_members where couple_id = v_inv.couple_id) >= 2 then
    raise exception 'couple_full';
  end if;

  if v_inv.last_sent_at > now() - interval '60 seconds' then
    raise exception 'resend_too_soon'
      using hint = ceil(extract(epoch from (v_inv.last_sent_at + interval '60 seconds' - now())))::text;
  end if;

  if v_inv.send_window_started_at <= now() - interval '24 hours' then
    v_window_at := now();
    v_sends := 0;
  else
    v_window_at := v_inv.send_window_started_at;
    v_sends := v_inv.sends_in_window;
  end if;

  if v_sends >= 5 then
    raise exception 'resend_limit_reached'
      using hint = ceil(extract(epoch from (v_window_at + interval '24 hours' - now())))::text;
  end if;

  v_expires_at := now() + private.invitation_ttl(p_ttl_days);

  update public.couple_invitations
     set token_hash             = p_token_hash,
         expires_at             = v_expires_at,
         last_sent_at           = now(),
         send_window_started_at = v_window_at,
         sends_in_window        = v_sends + 1
   where id = v_inv.id;

  return jsonb_build_object(
    'invitation_id', v_inv.id,
    'invited_email', v_inv.invited_email,
    'expires_at',    v_expires_at,
    'inviter_name',  (select display_name from public.profiles where id = v_uid),
    'couple_label',  private.couple_label(v_inv.couple_id)
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- cancel_couple_invitation: the old token stops working immediately.
-- -----------------------------------------------------------------------------

create or replace function public.cancel_couple_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.couple_invitations%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_inv from public.couple_invitations where id = p_invitation_id for update;

  if not found or not private.is_couple_member(v_inv.couple_id) then
    raise exception 'invitation_not_found';
  end if;
  if v_inv.accepted_at is not null then
    raise exception 'invitation_already_accepted';
  end if;
  if v_inv.cancelled_at is not null then
    return;
  end if;

  update public.couple_invitations
     set cancelled_at = now(), cancelled_by = v_uid
   where id = v_inv.id;
end;
$$;

-- -----------------------------------------------------------------------------
-- delete_couple: destructive. Soft-deletes the tenant (all content becomes
-- unreachable for everyone) and requires an explicit confirmation phrase.
-- -----------------------------------------------------------------------------

create or replace function public.delete_couple(p_couple_id uuid, p_confirmation text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not private.is_couple_member(p_couple_id) then
    raise exception 'couple_not_found';
  end if;
  if p_confirmation is distinct from 'DELETE OUR SPACE' then
    raise exception 'confirmation_mismatch';
  end if;

  update public.couple_invitations
     set cancelled_at = now(), cancelled_by = v_uid
   where couple_id = p_couple_id and accepted_at is null and cancelled_at is null;

  update public.couples set deleted_at = now() where id = p_couple_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Letters. SECURITY INVOKER: every statement runs under the caller's RLS.
-- The recipient is derived from membership, never supplied by the client.
-- -----------------------------------------------------------------------------

create or replace function public.create_letter(
  p_couple_id uuid,
  p_title     text,
  p_content   text,
  p_unlock_at timestamptz
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid       uuid := auth.uid();
  v_recipient uuid;
  v_letter_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not private.is_couple_member(p_couple_id) then
    raise exception 'couple_not_found';
  end if;
  if p_unlock_at is null then
    raise exception 'invalid_unlock_at';
  end if;

  select user_id into v_recipient
    from public.couple_members
   where couple_id = p_couple_id and user_id <> v_uid
   limit 1;

  if v_recipient is null then
    raise exception 'partner_not_joined';
  end if;

  insert into public.letters (couple_id, author_id, recipient_id, title, unlock_at)
  values (p_couple_id, v_uid, v_recipient, btrim(p_title), p_unlock_at)
  returning id into v_letter_id;

  insert into public.letter_contents (letter_id, couple_id, content)
  values (v_letter_id, p_couple_id, p_content);

  return v_letter_id;
end;
$$;

create or replace function public.update_letter(
  p_letter_id uuid,
  p_title     text,
  p_content   text,
  p_unlock_at timestamptz
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  -- Content first: its policy checks the letter is still sealed, which must be
  -- evaluated against the current unlock_at, before it is changed below.
  update public.letter_contents set content = p_content where letter_id = p_letter_id;
  if not found then
    raise exception 'letter_not_editable';
  end if;

  update public.letters
     set title = btrim(p_title), unlock_at = p_unlock_at
   where id = p_letter_id;
  if not found then
    raise exception 'letter_not_editable';
  end if;
end;
$$;

create or replace function public.mark_letter_opened(p_letter_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.letters
     set opened_at = now()
   where id = p_letter_id
     and recipient_id = auth.uid()
     and unlock_at <= now()
     and opened_at is null
     and private.is_couple_member(couple_id);
end;
$$;

-- -----------------------------------------------------------------------------
-- get_auth_account_state: SERVICE ROLE ONLY. Lets the server decide how to
-- deliver an invitation through Supabase Auth (invite email for new or
-- unverified addresses, sign-in link for existing accounts). Never exposed to
-- anon/authenticated, so it cannot be used to enumerate accounts.
-- -----------------------------------------------------------------------------

create or replace function public.get_auth_account_state(p_email text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select case when u.email_confirmed_at is null then 'unconfirmed' else 'confirmed' end
       from auth.users u
      where lower(u.email) = lower(btrim(p_email))
      limit 1),
    'none'
  );
$$;

-- -----------------------------------------------------------------------------
-- Function privileges. Postgres grants EXECUTE to PUBLIC by default and
-- Supabase adds anon/authenticated, so start from zero.
-- -----------------------------------------------------------------------------

revoke all on function public.create_couple(text, text, text, text, date, integer) from public, anon, authenticated;
revoke all on function public.get_invitation_preview(text) from public, anon, authenticated;
revoke all on function public.accept_couple_invitation(text, text) from public, anon, authenticated;
revoke all on function public.create_couple_invitation(uuid, text, text, integer) from public, anon, authenticated;
revoke all on function public.resend_couple_invitation(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.cancel_couple_invitation(uuid) from public, anon, authenticated;
revoke all on function public.delete_couple(uuid, text) from public, anon, authenticated;
revoke all on function public.create_letter(uuid, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.update_letter(uuid, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.mark_letter_opened(uuid) from public, anon, authenticated;
revoke all on function public.get_auth_account_state(text) from public, anon, authenticated;

grant execute on function public.get_invitation_preview(text) to anon, authenticated;
grant execute on function public.create_couple(text, text, text, text, date, integer) to authenticated;
grant execute on function public.accept_couple_invitation(text, text) to authenticated;
grant execute on function public.create_couple_invitation(uuid, text, text, integer) to authenticated;
grant execute on function public.resend_couple_invitation(uuid, text, integer) to authenticated;
grant execute on function public.cancel_couple_invitation(uuid) to authenticated;
grant execute on function public.delete_couple(uuid, text) to authenticated;
grant execute on function public.create_letter(uuid, text, text, timestamptz) to authenticated;
grant execute on function public.update_letter(uuid, text, text, timestamptz) to authenticated;
grant execute on function public.mark_letter_opened(uuid) to authenticated;

grant execute on all functions in schema public to service_role;
