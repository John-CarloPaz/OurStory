import { Images } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LinkButton } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/layout";
import { formatCalendarDate } from "@/lib/dates";
import { signMediaUrls, thumbnailOf } from "@/lib/storage/media";
import { requireActiveSpace } from "@/lib/tenant";

export const metadata: Metadata = { title: "Memories" };

export default async function MemoriesPage() {
  const space = await requireActiveSpace();
  const { data } = await space.supabase
    .from("journal_photos")
    .select("id, storage_path, thumb_path, width, height, caption, journal_id, journals(title, entry_date)")
    .order("created_at", { ascending: false })
    .limit(300);

  const photos = data ?? [];
  const urls = await signMediaUrls(space, photos.map(thumbnailOf));

  return (
    <div className="os-sections">
      <PageHeader
        eyebrow="Memories"
        title="Every picture, in one place"
        description="Photos from all of your entries. Add more from any chapter of your story."
      />

      {photos.length === 0 ? (
        <EmptyState icon={<Images className="size-5" />} title="No photos yet" action={<LinkButton href="/story">Open your story</LinkButton>}>
          Photos you add to journal entries appear here.
        </EmptyState>
      ) : (
        <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
          {photos.map((p) =>
            urls[thumbnailOf(p)] ? (
              <Link key={p.id} href={`/story/${p.journal_id}`} className="group relative mb-3 block break-inside-avoid overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element -- signed private URL */}
                <img
                  src={urls[thumbnailOf(p)]}
                  alt={p.caption ?? ""}
                  width={p.width ?? undefined}
                  height={p.height ?? undefined}
                  loading="lazy"
                  decoding="async"
                  style={p.width && p.height ? { aspectRatio: `${p.width} / ${p.height}` } : undefined}
                  className="h-auto w-full bg-accent-soft transition duration-500 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-10 text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                  <p className="text-sm leading-snug">{p.caption ?? p.journals?.title}</p>
                  {p.journals ? <p className="text-xs text-white/75">{formatCalendarDate(p.journals.entry_date, { dateStyle: "medium" })}</p> : null}
                </div>
              </Link>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
