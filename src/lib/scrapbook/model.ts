import { z } from "zod";

/**
 * Scrapbook pages.
 *
 * A page is a JSON document stored on journals.scrapbook. Coordinates use a
 * fixed logical page 1000 units wide (height depends on the page size), and
 * every element is positioned by its CENTER. The renderer maps units to CSS
 * container units, so the same page scales to any screen with no JS.
 *
 * Photos are referenced by journal_photos.id, never by URL, so signed URLs
 * never get stored and a deleted photo simply drops off the page.
 */

export const PAGE_WIDTH = 1000;

export const PAGE_SIZES = { portrait: 1333, square: 1000, tall: 1800 } as const;
export type PageSize = keyof typeof PAGE_SIZES;

export const PAPERS = ["dots", "plain", "lined", "grid", "kraft", "cork"] as const;
export type Paper = (typeof PAPERS)[number];

export const PAPER_DEFAULT_COLORS: Record<Paper, string> = {
  dots: "#fbf7ef",
  plain: "#fdf9f2",
  lined: "#fefcf7",
  grid: "#f7faff",
  kraft: "#c9a47c",
  cork: "#b98a5e",
};

export const PAPER_LABELS: Record<Paper, string> = {
  dots: "Dotted",
  plain: "Plain",
  lined: "Lined",
  grid: "Grid",
  kraft: "Kraft",
  cork: "Cork board",
};

export const PHOTO_FRAMES = ["polaroid", "plain", "rounded", "circle", "film", "stamp"] as const;
export type PhotoFrame = (typeof PHOTO_FRAMES)[number];

export const TEXT_FONTS = ["hand", "marker", "typewriter", "serif", "sans"] as const;
export type TextFont = (typeof TEXT_FONTS)[number];

export const TEXT_STYLES = ["plain", "sticky", "label", "torn"] as const;
export type TextStyle = (typeof TEXT_STYLES)[number];

export const TAPE_PATTERNS = ["stripes", "dots", "grid", "checks", "solid"] as const;
export type TapePattern = (typeof TAPE_PATTERNS)[number];

/** Soft scrapbook palette for notes, tape and ink. */
export const SWATCHES = [
  "#f6b8c2",
  "#ffcf99",
  "#fff0a0",
  "#c6e5c3",
  "#b5d8f0",
  "#d5c4ef",
  "#f3a58f",
  "#e8dfcc",
  "#3b2f2a",
  "#ffffff",
] as const;

export const EMOJI_STICKERS = [
  "❤️", "💕", "💌", "💍", "🌸", "🌷", "🌻", "🍀", "✨", "⭐", "🌙", "☀️",
  "🌈", "🦋", "🎈", "🎉", "🎁", "🍰", "☕", "🍓", "🍕", "🍷", "🏖️", "✈️",
  "📸", "🎵", "🎬", "🏠", "🐶", "🐱", "🧸", "🔑",
] as const;

export const SVG_STICKERS = ["heart", "star", "xoxo", "love-stamp", "arrow", "flower", "smile", "ticket"] as const;
export type SvgSticker = (typeof SVG_STICKERS)[number];

// Schema ----------------------------------------------------------------------------

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const base = {
  id: z.string().regex(/^[a-zA-Z0-9_-]{4,24}$/),
  x: z.number().finite().min(-300).max(1300),
  y: z.number().finite().min(-300).max(2100),
  w: z.number().finite().min(24).max(1100),
  rotation: z.number().finite().min(-180).max(180),
  z: z.number().int().min(0).max(10_000),
};

const photoElement = z.object({
  ...base,
  type: z.literal("photo"),
  photoId: z.uuid(),
  frame: z.enum(PHOTO_FRAMES),
  caption: z.string().max(80).optional(),
  /** height / width of the picture area */
  aspect: z.number().finite().min(0.3).max(3),
});

const stickerElement = z.object({
  ...base,
  type: z.literal("sticker"),
  sticker: z.string().refine((s) => (EMOJI_STICKERS as readonly string[]).includes(s) || (SVG_STICKERS as readonly string[]).includes(s)),
});

const textElement = z.object({
  ...base,
  type: z.literal("text"),
  text: z.string().max(600),
  font: z.enum(TEXT_FONTS),
  style: z.enum(TEXT_STYLES),
  align: z.enum(["left", "center", "right"]),
  color: hex,
  /** Note color for the sticky style. */
  fill: hex,
  size: z.number().finite().min(12).max(200),
});

const tapeElement = z.object({
  ...base,
  type: z.literal("tape"),
  pattern: z.enum(TAPE_PATTERNS),
  color: hex,
});

export const scrapElementSchema = z.discriminatedUnion("type", [photoElement, stickerElement, textElement, tapeElement]);

export const scrapbookSchema = z.object({
  version: z.literal(1),
  page: z.object({
    size: z.enum(Object.keys(PAGE_SIZES) as [PageSize, ...PageSize[]]),
    paper: z.enum(PAPERS),
    color: hex,
  }),
  elements: z.array(scrapElementSchema).max(120),
});

export type ScrapElement = z.infer<typeof scrapElementSchema>;
export type PhotoElement = z.infer<typeof photoElement>;
export type TextElement = z.infer<typeof textElement>;
export type StickerElement = z.infer<typeof stickerElement>;
export type TapeElement = z.infer<typeof tapeElement>;
export type Scrapbook = z.infer<typeof scrapbookSchema>;

export type ScrapPhoto = { id: string; width: number | null; height: number | null };

// Helpers ---------------------------------------------------------------------------

export function newElementId(): string {
  return globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

export function pageHeight(scrapbook: Pick<Scrapbook, "page">): number {
  return PAGE_SIZES[scrapbook.page.size];
}

export function photoAspect(photo: ScrapPhoto | undefined): number {
  if (!photo?.width || !photo?.height) return 1.2;
  return Math.min(1.5, Math.max(0.65, photo.height / photo.width));
}

function seededRandom(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/**
 * The page an entry shows before anyone decorates it: title, date label,
 * polaroids with tape, a sticker or two, and a note. Deterministic per entry,
 * so it doesn't reshuffle on every visit.
 */
export function generateLayout(input: {
  seed: string;
  title: string;
  dateLabel: string;
  mood: string | null;
  excerpt: string | null;
  photos: ScrapPhoto[];
}): Scrapbook {
  const random = seededRandom(input.seed);
  const jitter = (range: number) => (random() * 2 - 1) * range;
  const photos = input.photos.slice(0, 6);
  const size: PageSize = photos.length > 2 ? "tall" : "portrait";
  const papers: Paper[] = ["dots", "lined", "grid", "plain"];
  const paper = papers[Math.floor(random() * papers.length)];
  const elements: ScrapElement[] = [];
  let z = 1;

  elements.push({
    id: `gen${String(z).padStart(3, "0")}`,
    type: "text",
    x: 500,
    y: 150,
    w: 840,
    rotation: jitter(2.5),
    z: z++,
    text: input.title,
    font: "hand",
    style: "plain",
    align: "center",
    color: "#3b2f2a",
    fill: "#fff0a0",
    size: input.title.length > 28 ? 72 : 92,
  });

  elements.push({
    id: `gen${String(z).padStart(3, "0")}`,
    type: "text",
    x: 255,
    y: 285,
    w: 380,
    rotation: -3 + jitter(1.5),
    z: z++,
    text: input.dateLabel,
    font: "typewriter",
    style: "label",
    align: "center",
    color: "#ffffff",
    fill: "#3b2f2a",
    size: 26,
  });

  elements.push({
    id: `gen${String(z).padStart(3, "0")}`,
    type: "sticker",
    x: 870,
    y: 90,
    w: 110,
    rotation: jitter(14),
    z: z++,
    sticker: EMOJI_STICKERS[Math.floor(random() * 12)],
  });

  const slots = [
    { x: 300, y: 620 },
    { x: 700, y: 760 },
    { x: 310, y: 1120 },
    { x: 700, y: 1260 },
    { x: 290, y: 1580 },
    { x: 710, y: 1600 },
  ];
  const tapeColors = ["#f6b8c2", "#b5d8f0", "#ffcf99", "#c6e5c3", "#d5c4ef"];

  photos.forEach((photo, index) => {
    const slot = slots[index];
    const w = 390;
    const aspect = photoAspect(photo);
    const rotation = jitter(7);
    elements.push({
      id: `gen${String(z).padStart(3, "0")}`,
      type: "photo",
      x: slot.x + jitter(20),
      y: slot.y + jitter(20),
      w,
      rotation,
      z: z++,
      photoId: photo.id,
      frame: "polaroid",
      aspect,
    });
    if (index < 4) {
      const outerHeight = w * 0.9 * aspect + w * 0.27;
      elements.push({
        id: `gen${String(z).padStart(3, "0")}`,
        type: "tape",
        x: slot.x + jitter(30),
        y: slot.y - outerHeight / 2 + 4,
        w: 170,
        rotation: jitter(12),
        z: z++,
        pattern: TAPE_PATTERNS[Math.floor(random() * 4)],
        color: tapeColors[Math.floor(random() * tapeColors.length)],
      });
    }
  });

  const noteText = input.excerpt ?? (photos.length === 0 ? "Add photos, stickers and notes to make this page yours ✿" : null);
  if (noteText) {
    const noteY = photos.length === 0 ? 700 : size === "tall" ? 1640 : 1150;
    const noteX = photos.length === 1 ? 700 : photos.length === 0 ? 500 : 500;
    elements.push({
      id: `gen${String(z).padStart(3, "0")}`,
      type: "text",
      x: photos.length === 1 ? 700 : noteX,
      y: photos.length === 1 ? 1120 : noteY,
      w: photos.length === 0 ? 560 : 420,
      rotation: 2 + jitter(3),
      z: z++,
      text: noteText.length > 170 ? `${noteText.slice(0, 167).trimEnd()}…` : noteText,
      font: "hand",
      style: "sticky",
      align: "left",
      color: "#3b2f2a",
      fill: "#fff0a0",
      size: 36,
    });
  }

  if (input.mood) {
    elements.push({
      id: `gen${String(z).padStart(3, "0")}`,
      type: "text",
      x: 760,
      y: 300,
      w: 300,
      rotation: 5 + jitter(3),
      z: z++,
      text: input.mood,
      font: "marker",
      style: "plain",
      align: "center",
      color: "#b4553d",
      fill: "#fff0a0",
      size: 40,
    });
  }

  elements.push({
    id: `gen${String(z).padStart(3, "0")}`,
    type: "sticker",
    x: photos.length ? 860 : 160,
    y: (size === "tall" ? PAGE_SIZES.tall : PAGE_SIZES.portrait) - 110,
    w: 140,
    rotation: jitter(18),
    z: z++,
    sticker: SVG_STICKERS[Math.floor(random() * SVG_STICKERS.length)],
  });

  return { version: 1, page: { size, paper, color: PAPER_DEFAULT_COLORS[paper] }, elements };
}

/**
 * A saved page, cleaned for display: invalid documents fall back to the
 * generated layout, and photos that no longer exist are dropped.
 */
export function resolveScrapbook(stored: unknown, fallback: () => Scrapbook, photoIds: Set<string>): { scrapbook: Scrapbook; saved: boolean } {
  const parsed = scrapbookSchema.safeParse(stored);
  if (!parsed.success) return { scrapbook: fallback(), saved: false };
  return {
    scrapbook: {
      ...parsed.data,
      elements: parsed.data.elements.filter((el) => el.type !== "photo" || photoIds.has(el.photoId)),
    },
    saved: true,
  };
}

/** "Bumble Match!" on 2026-06-01 -> "bumble-match-2026-06-01.png". Falls back to "scrapbook-page". */
export function scrapbookFileName(title: string, entryDate: string | null): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  const date = entryDate && /^\d{4}-\d{2}-\d{2}$/.test(entryDate) ? entryDate : null;
  return `${[slug || "scrapbook-page", date].filter(Boolean).join("-")}.png`;
}
