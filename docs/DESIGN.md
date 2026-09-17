# Design system

**Direction:** a modern journal. Glassy surfaces float over a slowly
drifting aurora with film grain. The journal feel comes from scrapbook
materials: polaroids, washi tape, sticky notes, stamps, stickers, and
handwritten accents. Motion is gentle and purposeful: pages ease in, content
reveals as you scroll, and photos lift and straighten on hover.

Everything is theme-driven. A couple's theme (src/lib/theme.ts) sets `--os-*`
CSS variables; components only use tokens, so every theme, including the dark
"Midnight" preset, works without special cases.

## Tokens (Tailwind classes)

| Use | Classes |
| --- | --- |
| Text | `text-ink` (primary), `text-muted` (secondary), `text-accent` |
| Accent fills | `bg-accent text-on-accent`, soft: `bg-accent-soft` |
| Lines | `border-line` |
| Surfaces | `.os-card` (theme card: glass by default), `.os-glass` (chips, pills, secondary buttons), add `.os-frost` for real backdrop blur (floating chrome only) |
| Fields | `bg-field` |
| Danger | `text-danger`, `bg-danger/10` |

**Paper materials are physical objects.** Polaroids, sticky notes, tape and
scrapbook pages keep their own light paper colors with dark ink (`#3b2f2a`) in
every theme. Everything else uses tokens.

## Type

- `.os-display`: display serif (Fraunces, soft "wonky" cut). Page titles and card titles.
- `.os-hand`: handwriting (Caveat). Short asides, captions, notes. Use about 1.4× the size you'd use for sans text.
- `.os-eyebrow`: small uppercase accent label.
- `.os-prose`: long-form body text.
- Stamps and labels: `.os-stamp` uses the typewriter face.

## CSS classes (src/app/globals.css)

- Motion: `.os-reveal` (use the `<Reveal index>` component), `.os-pop`, `.os-float`, `.os-wiggle` (on hover), `.os-lift` (hover lift plus accent glow), `.os-page-enter` (already applied to every space page).
- Materials: `.os-polaroid` (set `--tilt`), `.os-tape` (`data-pattern`: stripes|dots|grid|checks|solid, `--tape` color), `.os-sticky` (`--note` color, `--tilt`), `.os-stamp` (`--tilt`), `.os-sticker` (white die-cut outline), `.os-emoji`.

All motion is disabled automatically under `prefers-reduced-motion`.

## Components

- `@/components/ui/layout`: `Card`, `Reveal`, `PageHeader` (`eyebrow`, `title`, `note` handwritten aside, `description`, `actions`), `SectionTitle`, `EmptyState`, `Badge`, `Avatar`.
- `@/components/ui/button`: `Button`, `LinkButton`, `buttonClass(variant, size, className)`. Variants: primary (gradient), secondary (glass), ghost, danger.
- `@/components/ui/form`: `Field`, `Input`, `Textarea`, `Select`, `SubmitButton` (pass `pending`), `FormMessage`, `ConfirmSubmit`. Forms use `useFormAction` from `@/components/ui/use-form-action` and spread `formProps` on `<form>`.
- `@/components/decor/materials`: `Tape`, `Polaroid`, `StickyNote`, `Stamp`, `Doodle` (heart, star, sparkle, squiggle, arrow, underline, circle).
- `@/components/scrapbook/scrapbook-page`: `ScrapbookPage` renders a scrapbook page at any size (`quality="export"` loads original photos right away, for image export).
- `@/lib/scrapbook/export-image`: turns a rendered page into a PNG (download, or the share sheet on iPhone/iPad). Used by the Download button on each entry.

## Layout and responsiveness

- Space pages render inside `<main>` (max-w-6xl, side padding, bottom padding for the phone tab bar).
- Design phone-first at 360–390px: single column, then `sm:`/`lg:` grids. No horizontal overflow. Touch targets are at least 40px.
- Below `lg`, navigation is a floating bottom tab bar; don't place fixed UI in the bottom 6rem on phones.
- Decorative elements get `aria-hidden` and `pointer-events-none`.

## Rules

- Keep it tasteful: one or two decorative accents per section, not confetti everywhere.
- Motion never hides content or blocks interaction. Hover effects need a non-hover equivalent (content is fully usable on touch).
- Never animate the `transform` of an element whose `transform` also positions it; wrap it instead.
- Entrance animations use fill-mode `backwards`, never `both`/`forwards` (e.g. `animate-[os-pop_0.3s_ease-out_backwards]`). A leftover end transform breaks `position: fixed` inside the element.
- Text contrast: body text uses `text-ink`/`text-muted` on theme surfaces, and dark ink on paper materials.
- Don't hard-code couple names or copy that assumes a specific couple.

## Performance

The app has to stay smooth on mid-range phones, so the expensive effects are rationed:

- `backdrop-filter` (`.os-frost`) only on floating chrome: header, tab bar, menus, sheets, the scrapbook editor dock. Never on cards, lists or inputs; they are translucent without blur.
- Nothing full-screen animates or uses `mix-blend-mode`. The grain is static; the aurora drifts only on large screens.
- No `background-attachment: fixed`; draw fixed backgrounds on a `position: fixed` layer.
- Every space page shows `(space)/loading.tsx` right away while the server renders, and recently visited pages are reused for 30 seconds (`experimental.staleTimes` in next.config.ts).
- Filter list queries by `couple_id` (RLS alone also allows rows from a person's other spaces).
- Check changes with `node scripts/perf-check.mjs` against a production build.
