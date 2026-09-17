-- =============================================================================
-- Our Story :: 0600 scrapbook pages + glass/aurora theme options
--
-- 1. Each journal entry can carry a scrapbook page: a JSON document describing
--    the paper and the placed elements (photos, stickers, notes, washi tape).
--    It lives on the journal row, so the existing journal RLS applies: both
--    members of the couple can view and edit it, nobody else can see it.
--    The app validates its shape; the database caps its size.
--    scrapbook_updated_at lets the app detect when both partners edited at once.
--
-- 2. New theme options: "glass" cards and "aurora"/"retro" backgrounds.
--    Couples still on the original defaults move to the new defaults.
-- =============================================================================

alter table public.journals
  add column if not exists scrapbook jsonb,
  add column if not exists scrapbook_updated_at timestamptz,
  add column if not exists scrapbook_updated_by uuid references auth.users (id) on delete set null;

alter table public.journals
  drop constraint if exists journals_scrapbook_shape;

alter table public.journals
  add constraint journals_scrapbook_shape check (
    scrapbook is null
    or (jsonb_typeof(scrapbook) = 'object' and pg_column_size(scrapbook) <= 262144)
  );

alter table public.couple_themes
  drop constraint if exists couple_themes_card_style_check,
  drop constraint if exists couple_themes_background_style_check;

alter table public.couple_themes
  add constraint couple_themes_card_style_check
    check (card_style in ('glass', 'soft', 'flat', 'outlined', 'elevated')),
  add constraint couple_themes_background_style_check
    check (background_style in ('aurora', 'retro', 'plain', 'paper', 'grain', 'gradient'));

alter table public.couple_themes
  alter column card_style set default 'glass',
  alter column background_style set default 'aurora';

update public.couple_themes
   set card_style = 'glass', background_style = 'aurora'
 where card_style = 'soft' and background_style = 'paper';
