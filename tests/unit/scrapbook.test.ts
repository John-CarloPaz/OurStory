import { describe, expect, it } from "vitest";
import { generateLayout, resolveScrapbook, scrapbookSchema, type Scrapbook } from "@/lib/scrapbook/model";

const PHOTO_A = "11111111-1111-4111-8111-111111111111";
const PHOTO_B = "22222222-2222-4222-8222-222222222222";

function layout(photoCount: number, overrides: Partial<Parameters<typeof generateLayout>[0]> = {}) {
  return generateLayout({
    seed: "33333333-3333-4333-8333-333333333333",
    title: "The day we met",
    dateLabel: "SEP 14, 2025",
    mood: "giddy",
    excerpt: "It rained the whole way home.",
    photos: Array.from({ length: photoCount }, (_, i) => ({ id: `${i}${PHOTO_A.slice(1)}`, width: 1200, height: 900 })),
    ...overrides,
  });
}

describe("scrapbook model", () => {
  it("generated layouts always pass the same validation used when saving", () => {
    for (const count of [0, 1, 2, 3, 6, 9]) {
      const result = scrapbookSchema.safeParse(layout(count));
      expect(result.success, `${count} photos: ${result.success ? "" : JSON.stringify(result.error.issues[0])}`).toBe(true);
    }
    const long = scrapbookSchema.safeParse(layout(2, { title: "x".repeat(160), mood: null, excerpt: null }));
    expect(long.success).toBe(true);
  });

  it("is deterministic per entry, so a page doesn't reshuffle between visits", () => {
    expect(layout(3)).toEqual(layout(3));
    expect(layout(3, { seed: "another-entry" })).not.toEqual(layout(3));
  });

  it("places at most six photos and uses a tall page when there are many", () => {
    const page = layout(9);
    expect(page.elements.filter((el) => el.type === "photo")).toHaveLength(6);
    expect(page.page.size).toBe("tall");
  });

  it("drops photos that no longer exist and falls back when the stored page is invalid", () => {
    const saved: Scrapbook = {
      version: 1,
      page: { size: "portrait", paper: "kraft", color: "#c9a47c" },
      elements: [
        { id: "photo-a1", type: "photo", photoId: PHOTO_A, frame: "polaroid", aspect: 1, x: 300, y: 400, w: 380, rotation: -4, z: 1 },
        { id: "photo-b1", type: "photo", photoId: PHOTO_B, frame: "film", aspect: 1, x: 700, y: 400, w: 380, rotation: 4, z: 2 },
      ],
    };
    const fallback = () => layout(0);

    const resolved = resolveScrapbook(saved, fallback, new Set([PHOTO_A]));
    expect(resolved.saved).toBe(true);
    expect(resolved.scrapbook.elements.map((el) => el.id)).toEqual(["photo-a1"]);

    expect(resolveScrapbook(null, fallback, new Set()).saved).toBe(false);
    expect(resolveScrapbook({ version: 2, elements: "nope" }, fallback, new Set()).scrapbook).toEqual(layout(0));
  });

  it("rejects unknown stickers, script-like colors, oversized text and too many elements", () => {
    const base = layout(0);
    const withElement = (element: unknown) => scrapbookSchema.safeParse({ ...base, elements: [element] }).success;
    const text = { id: "text-001", type: "text", x: 500, y: 500, w: 400, rotation: 0, z: 1, font: "hand", style: "plain", align: "left", color: "#000000", fill: "#ffffff", size: 40 };

    expect(withElement({ ...text, text: "hello" })).toBe(true);
    expect(withElement({ ...text, text: "x".repeat(601) })).toBe(false);
    expect(withElement({ ...text, text: "hi", color: "red;background:url(javascript:alert(1))" })).toBe(false);
    expect(withElement({ id: "stick-01", type: "sticker", sticker: "<img onerror=alert(1)>", x: 1, y: 1, w: 100, rotation: 0, z: 1 })).toBe(false);
    expect(withElement({ id: "photo-01", type: "photo", photoId: "../../etc/passwd", frame: "polaroid", aspect: 1, x: 1, y: 1, w: 100, rotation: 0, z: 1 })).toBe(false);

    const many = Array.from({ length: 121 }, (_, i) => ({ ...text, id: `text-${String(i).padStart(3, "0")}`, text: "x" }));
    expect(scrapbookSchema.safeParse({ ...base, elements: many }).success).toBe(false);
  });
});
