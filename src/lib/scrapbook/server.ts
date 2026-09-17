import "server-only";
import type { Json } from "@/lib/database.types";
import { formatCalendarDate } from "@/lib/dates";
import { generateLayout, resolveScrapbook, type ScrapPhoto, type Scrapbook } from "./model";

/** Everything needed to show an entry's page: the saved page, or the generated one. */
export function scrapbookForJournal(
  journal: { id: string; title: string; entry_date: string; mood: string | null; body: string | null; scrapbook: Json | null },
  photos: ScrapPhoto[],
): { scrapbook: Scrapbook; generated: Scrapbook; saved: boolean } {
  const generated = generateLayout({
    seed: journal.id,
    title: journal.title,
    dateLabel: formatCalendarDate(journal.entry_date, { month: "short", day: "numeric", year: "numeric" }).toUpperCase(),
    mood: journal.mood,
    excerpt: journal.body ? journal.body.slice(0, 180) : null,
    photos,
  });
  const { scrapbook, saved } = resolveScrapbook(journal.scrapbook, () => generated, new Set(photos.map((p) => p.id)));
  return { scrapbook, generated, saved };
}
