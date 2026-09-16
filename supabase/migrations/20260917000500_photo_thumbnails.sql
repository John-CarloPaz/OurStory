-- =============================================================================
-- Our Story :: 0500 photo thumbnails
--
-- Grids and timelines show a small thumbnail instead of the full original.
-- The browser generates the thumbnail at upload time and stores it next to the
-- original, in the same tenant folder:
--
--   couples/{couple_id}/journals/{journal_id}/{uuid}.{ext}    original (storage_path)
--   couples/{couple_id}/journals/{journal_id}/{uuid}.webp     thumbnail (thumb_path)
--
-- width/height are the original's display dimensions, so layouts can reserve
-- space before the image arrives. Members cannot change these columns after
-- insert (only `caption` is granted for update).
-- =============================================================================

alter table public.journal_photos
  add column if not exists thumb_path text unique,
  add column if not exists width integer check (width is null or width between 1 and 20000),
  add column if not exists height integer check (height is null or height between 1 and 20000);

alter table public.journal_photos
  drop constraint if exists journal_photos_thumb_path_scoped;

alter table public.journal_photos
  add constraint journal_photos_thumb_path_scoped check (
    thumb_path is null
    or (
      thumb_path <> storage_path
      and thumb_path ~ ('^couples/' || couple_id::text || '/journals/' || journal_id::text
                        || '/[0-9a-f-]{36}\.(jpg|png|webp|gif|avif)$')
    )
  );
