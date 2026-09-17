import { Images } from "lucide-react";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Doodle, Tape, type TapePattern } from "@/components/decor/materials";
import { LinkButton } from "@/components/ui/button";
import { EmptyState, PageHeader, Reveal } from "@/components/ui/layout";
import { formatCalendarDate } from "@/lib/dates";
import { signMediaUrls, thumbnailOf } from "@/lib/storage/media";
import { requireActiveSpace } from "@/lib/tenant";

export const metadata: Metadata = { title: "Memories" };

const TILTS = [-2.4, 1.8, -1.1, 2.6, -1.8, 1.2, -2.8, 0.9];
const TAPES: { color: string; pattern: TapePattern }[] = [
  { color: "#f6b8c2", pattern: "stripes" },
  { color: "#b5d8f0", pattern: "dots" },
  { color: "#ffcf99", pattern: "grid" },
  { color: "#c6e5c3", pattern: "checks" },
  { color: "#d5c4ef", pattern: "stripes" },
];

export default async function MemoriesPage() {
  const space = await requireActiveSpace();
  const { data } = await space.supabase
    .from("journal_photos")
    .select("id, storage_path, thumb_path, width, height, caption, journal_id, journals(title, entry_date)")
    .eq("couple_id", space.coupleId)
    .order("created_at", { ascending: false })
    .limit(300);

  const photos = data ?? [];
  const urls = await signMediaUrls(space, photos.map(thumbnailOf));

  return (
    <div className="os-sections">
      <PageHeader
        eyebrow="Memories"
        title="Every picture, in one place"
        note="pinned with love"
        description="Photos from all of your entries. Add more from any chapter of your story."
      />

      {photos.length === 0 ? (
        <EmptyState icon={<Images className="size-5" />} title="No photos yet" action={<LinkButton href="/story">Open your story</LinkButton>}>
          Photos you add to journal entries appear here.
        </EmptyState>
      ) : (
        <div className="relative">
          <Doodle kind="squiggle" className="pointer-events-none absolute -top-8 right-2 hidden h-8 w-20 text-accent/40 sm:block" />
          <div className="columns-2 gap-x-4 pt-2 sm:columns-3 sm:gap-x-6 lg:columns-4 lg:gap-x-7">
            {photos.map((p, index) => {
              const src = urls[thumbnailOf(p)];
              if (!src) return null;
              const caption = p.caption ?? p.journals?.title;
              const tape = index % 3 === 0 ? TAPES[(index / 3) % TAPES.length] : null;
              return (
                <Reveal key={p.id} index={index % 4} className="mb-7 break-inside-avoid pt-2 sm:mb-9">
                  <Link href={`/story/${p.journal_id}`} className="group relative block rounded-[3px]">
                    {tape ? (
                      <Tape
                        className="absolute -top-2.5 left-1/2 z-10 h-5 w-16 -translate-x-1/2 sm:w-20"
                        rotate={index % 2 ? 6 : -5}
                        color={tape.color}
                        pattern={tape.pattern}
                      />
                    ) : null}
                    <figure
                      className="os-polaroid p-2 pb-3 [--tilt:var(--t)] group-focus-visible:[--tilt:0deg] sm:p-2.5 sm:pb-3.5"
                      style={{ "--t": `${TILTS[index % TILTS.length]}deg` } as CSSProperties}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- signed private URL */}
                      <img
                        src={src}
                        alt={p.caption ?? ""}
                        width={p.width ?? undefined}
                        height={p.height ?? undefined}
                        loading="lazy"
                        decoding="async"
                        style={p.width && p.height ? { aspectRatio: `${p.width} / ${p.height}` } : undefined}
                        className="h-auto w-full rounded-[2px] bg-[#efe7da]"
                      />
                      {caption || p.journals ? (
                        <figcaption className="px-1 pt-2 text-center">
                          {caption ? <span className="os-hand line-clamp-2 text-xl leading-[1.1] text-[#3b2f2a] sm:text-[1.45rem]">{caption}</span> : null}
                          {p.journals ? (
                            <span className="font-typewriter mt-1 block text-[0.62rem] tracking-[0.14em] text-[#7a6c64] uppercase">
                              {formatCalendarDate(p.journals.entry_date, { dateStyle: "medium" })}
                            </span>
                          ) : null}
                        </figcaption>
                      ) : null}
                    </figure>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
