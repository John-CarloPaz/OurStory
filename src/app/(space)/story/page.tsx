import { BookOpen, Images, MessageCircleHeart, PenLine } from "lucide-react";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Tape } from "@/components/decor/materials";
import { ScrapbookPage } from "@/components/scrapbook/scrapbook-page";
import { LinkButton } from "@/components/ui/button";
import { EmptyState, PageHeader, Reveal } from "@/components/ui/layout";
import { formatCalendarDate } from "@/lib/dates";
import { scrapbookForJournal } from "@/lib/scrapbook/server";
import { signMediaUrls, thumbnailOf } from "@/lib/storage/media";
import { requireActiveSpace } from "@/lib/tenant";

export const metadata: Metadata = { title: "Story" };

const TAPE_COLORS = ["#f6b8c2", "#b5d8f0", "#ffcf99", "#c6e5c3", "#d5c4ef"];

export default async function StoryPage() {
  const space = await requireActiveSpace();
  const { data: journals } = await space.supabase
    .from("journals")
    .select(
      "id, title, entry_date, mood, body, scrapbook, scrapbook_updated_at, journal_photos(id, storage_path, thumb_path, width, height), journal_reflections(count)",
    )
    .eq("couple_id", space.coupleId)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  const entries = journals ?? [];
  // Mini pages only need thumbnails.
  const urls = await signMediaUrls(space, entries.flatMap((j) => j.journal_photos.map(thumbnailOf)));

  const byMonth = new Map<string, typeof entries>();
  for (const entry of entries) {
    const key = entry.entry_date.slice(0, 7);
    byMonth.set(key, [...(byMonth.get(key) ?? []), entry]);
  }

  let cardIndex = 0;

  return (
    <div className="os-sections">
      <PageHeader
        eyebrow="Your story"
        title="Our scrapbook"
        note="every page is ours"
        description="Each entry is a page you can decorate together, with photos, stickers, tape and little notes."
        actions={
          <LinkButton href="/story/new">
            <PenLine className="size-4" aria-hidden /> New page
          </LinkButton>
        }
      />

      {entries.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="size-6" />}
          title="The first page is waiting"
          action={<LinkButton href="/story/new">Start your scrapbook</LinkButton>}
        >
          Write about the day you met, a trip you loved, or simply today. Then decorate it together.
        </EmptyState>
      ) : (
        [...byMonth.entries()].map(([month, items]) => (
          <section key={month} className="space-y-6">
            <h2 className="relative inline-block">
              <Tape className="absolute inset-0 !h-full !w-full" rotate={-2} color={TAPE_COLORS[cardIndex % TAPE_COLORS.length]} pattern="stripes" />
              <span className="os-hand relative block px-5 py-1 text-2xl text-[#3b2f2a]">
                {formatCalendarDate(`${month}-01`, { month: "long", year: "numeric" })}
              </span>
            </h2>
            <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((j) => {
                const index = cardIndex++;
                const photos = j.journal_photos.map((p) => ({ id: p.id, width: p.width, height: p.height }));
                const { scrapbook } = scrapbookForJournal(j, photos);
                const sources = Object.fromEntries(j.journal_photos.map((p) => [p.id, { thumb: urls[thumbnailOf(p)] ?? null, full: null }]));
                const reflections = j.journal_reflections[0]?.count ?? 0;
                const tilt = [-1.6, 1.2, -0.6, 1.8][index % 4];
                return (
                  <Reveal key={j.id} as="li" index={index % 6}>
                    <Link
                      href={`/story/${j.id}`}
                      className="group block rotate-(--tilt) transition duration-500 ease-[cubic-bezier(0.34,1.4,0.64,1)] hover:-translate-y-1.5 hover:rotate-0 focus-visible:rotate-0"
                      style={{ "--tilt": `${tilt}deg` } as CSSProperties}
                    >
                      <div className="pointer-events-none relative">
                        <ScrapbookPage scrapbook={scrapbook} photos={sources} className="transition-shadow" />
                        <span aria-hidden className="absolute inset-0 rounded-[1.2cqw] ring-0 ring-accent/40 transition group-hover:ring-4" />
                      </div>
                      <div className="mt-4 px-1">
                        <p className="os-eyebrow">
                          {formatCalendarDate(j.entry_date, { weekday: "short", month: "short", day: "numeric" })}
                          {j.mood ? ` · ${j.mood}` : ""}
                        </p>
                        <h3 className="os-display mt-1 text-2xl leading-snug text-ink transition group-hover:text-accent">{j.title}</h3>
                        <p className="mt-1.5 flex gap-4 text-xs text-muted">
                          {j.journal_photos.length ? (
                            <span className="inline-flex items-center gap-1">
                              <Images className="size-3.5" aria-hidden /> {j.journal_photos.length}
                            </span>
                          ) : null}
                          {reflections ? (
                            <span className="inline-flex items-center gap-1">
                              <MessageCircleHeart className="size-3.5" aria-hidden /> {reflections}
                            </span>
                          ) : null}
                          {j.scrapbook_updated_at ? <span className="os-hand text-base leading-none text-accent">decorated ✿</span> : null}
                        </p>
                      </div>
                    </Link>
                  </Reveal>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
