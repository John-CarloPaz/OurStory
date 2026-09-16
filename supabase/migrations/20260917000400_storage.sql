-- =============================================================================
-- Our Story :: 0400 storage
--
-- One private bucket. Every object lives under its tenant prefix:
--
--   couples/{couple_id}/cover/{uuid}.{ext}
--   couples/{couple_id}/avatars/{user_id}/{uuid}.{ext}
--   couples/{couple_id}/journals/{journal_id}/{uuid}.{ext}
--
-- Object names must match that grammar exactly (lowercase UUIDs, server
-- generated file names, allow-listed image extensions), so user-supplied file
-- names and path traversal ("..", extra segments, odd characters) are rejected
-- by the policy itself. Knowing another couple's UUID grants nothing: every
-- policy re-checks membership of the couple named in the path.
--
-- The bucket enforces MIME type and size limits server-side as well. SVG is
-- intentionally not allowed (it can carry script).
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'couple-media',
  'couple-media',
  false,
  15 * 1024 * 1024,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Parses an object name. Returns null for anything that is not a valid path.
create or replace function private.parse_media_path(p_name text)
returns table (couple_id uuid, area text, owner_segment uuid)
language sql
immutable
set search_path = ''
as $$
  select
    m[1]::uuid,
    m[2],
    m[3]::uuid
  from regexp_match(
    p_name,
    '^couples/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/'
    || '(cover|avatars|journals)/'
    || '(?:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/)?'
    || '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    || '\.(jpg|png|webp|gif|avif)$'
  ) as m
  where m is not null
    -- cover has no owner segment; avatars and journals require one.
    and ((m[2] = 'cover') = (m[3] is null));
$$;

create or replace function private.can_read_media(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select private.is_couple_member(p.couple_id) from private.parse_media_path(p_name) p),
    false
  );
$$;

create or replace function private.can_upload_media(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select private.is_couple_member(p.couple_id)
       and case p.area
             when 'cover'    then true
             -- You can only upload your own avatar.
             when 'avatars'  then p.owner_segment = (select auth.uid())
             -- The journal must exist and belong to the same couple.
             when 'journals' then exists (
               select 1 from public.journals j
                where j.id = p.owner_segment and j.couple_id = p.couple_id
             )
             else false
           end
    from private.parse_media_path(p_name) p
  ), false);
$$;

create or replace function private.can_delete_media(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  -- No journal-existence check: photos are removed after their journal row.
  select coalesce((
    select private.is_couple_member(p.couple_id)
       and (p.area <> 'avatars' or p.owner_segment = (select auth.uid()))
    from private.parse_media_path(p_name) p
  ), false);
$$;

revoke all on all functions in schema private from public;
grant execute on all functions in schema private to authenticated, service_role;

drop policy if exists couple_media_select on storage.objects;
drop policy if exists couple_media_insert on storage.objects;
drop policy if exists couple_media_delete on storage.objects;

create policy couple_media_select on storage.objects
  for select to authenticated
  using (bucket_id = 'couple-media' and private.can_read_media(name));

create policy couple_media_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'couple-media' and private.can_upload_media(name));

create policy couple_media_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'couple-media' and private.can_delete_media(name));

-- No UPDATE policy: objects are immutable (no upsert/overwrite, no move).
