import { BookOpen, Images, MessageCircleHeart, PenLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LinkButton } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/layout";
import { formatCalendarDate } from "@/lib/dates";
import { signMediaUrls, thumbnailOf } from "@/lib/storage/media";
import { requireActiveSpace } from "@/lib/tenant";

export const metadata: Metadata = { title: "Story" };

export default async function StoryPage() {
  const space = await requireActiveSpace();
  const { data: journals } = await space.supabase
    .from("journals")
    .select("id, title, entry_date, mood, body, journal_photos(storage_path, thumb_path), journal_reflections(count)")
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  const entries = journals ?? [];
  const urls = await signMediaUrls(
    space,
    entries.map((j) => (j.journal_photos[0] ? thumbnailOf(j.journal_photos[0]) : null)),
  );

  const byMonth = new Map<string, typeof entries>();
  for (const entry of entries) {
    const key = entry.entry_date.slice(0, 7);
    byMonth.set(key, [...(byMonth.get(key) ?? []), entry]);
  }

  return (
    <div className="os-sections">
      <PageHeader
        eyebrow="Your story"
        title="Every chapter, together"
        description="The days you want to remember, in your own words, with room for each of you to reflect."
        actions={
          <LinkButton href="/story/new">
            <PenLine className="size-4" aria-hidden /> New entry
          </LinkButton>
        }
      />

      {entries.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="size-5" />}
          title="No entries yet"
          action={<LinkButton href="/story/new">Write the first entry</LinkButton>}
        >
          Start with the day you met, a trip you loved, or simply today.
        </EmptyState>
      ) : (
        [...byMonth.entries()].map(([month, items]) => (
          <section key={month}>
            <h2 className="os-eyebrow mb-4">{formatCalendarDate(`${month}-01`, { month: "long", year: "numeric" })}</h2>
            <ol className="space-y-[var(--os-gap)] border-l border-line pl-6">
              {items.map((j) => {
                const photo = j.journal_photos[0] ? thumbnailOf(j.journal_photos[0]) : null;
                const reflections = j.journal_reflections[0]?.count ?? 0;
                return (
                  <li key={j.id} className="relative">
                    <span className="absolute top-6 -left-[1.95rem] size-3 rounded-full border-2 border-canvas bg-accent" aria-hidden />
                    <Link href={`/story/${j.id}`} className="os-card group flex gap-5 overflow-hidden p-4 transition hover:-translate-y-0.5 sm:p-5">
                      {photo && urls[photo] ? (
                        // eslint-disable-next-line @next/next/no-img-element -- signed private URL
                        <img src={urls[photo]} alt="" loading="lazy" decoding="async" className="hidden size-28 shrink-0 rounded-xl bg-accent-soft object-cover sm:block" />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted">
                          {formatCalendarDate(j.entry_date, { weekday: "long", month: "long", day: "numeric" })}
                          {j.mood ? ` · ${j.mood}` : ""}
                        </p>
                        <h3 className="os-display mt-1 text-2xl leading-snug text-ink group-hover:text-accent">{j.title}</h3>
                        {j.body ? <p className="mt-2 line-clamp-2 leading-relaxed text-muted">{j.body}</p> : null}
                        <p className="mt-3 flex gap-4 text-xs text-muted">
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
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        ))
      )}
    </div>
  );
}
