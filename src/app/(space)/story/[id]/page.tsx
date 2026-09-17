import { ArrowLeft, Images, Lock, Pencil, Trash2, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteJournal, deletePhoto, deleteReflection } from "@/app/actions/journals";
import { PlaceIcon } from "@/components/content-meta";
import { Doodle, Stamp, Tape } from "@/components/decor/materials";
import { ImageUpload } from "@/components/image-upload";
import { ScrapbookBoard } from "@/components/scrapbook/scrapbook-board";
import { LinkButton } from "@/components/ui/button";
import { ConfirmSubmit } from "@/components/ui/form";
import { Avatar, Badge, Reveal, SectionTitle } from "@/components/ui/layout";
import { formatCalendarDate, formatInstant } from "@/lib/dates";
import { scrapbookForJournal } from "@/lib/scrapbook/server";
import { signMediaUrls, thumbnailOf } from "@/lib/storage/media";
import { requireActiveSpace } from "@/lib/tenant";
import { getViewerTimeZone } from "@/lib/timezone";
import { uuid } from "@/lib/validation";
import { CaptionForm, ReflectionForm } from "./journal-detail-forms";

export const metadata: Metadata = { title: "Entry" };

const NOTE_COLORS = ["#fff0a0", "#f6d3db", "#d6ebd3", "#d8e8f5"];

export default async function JournalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();

  const space = await requireActiveSpace();
  const tz = await getViewerTimeZone();
  const { supabase } = space;

  const [journalRes, photosRes, reflectionsRes, placesRes] = await Promise.all([
    supabase
      .from("journals")
      .select("id, title, entry_date, mood, body, created_by, created_at, scrapbook, scrapbook_updated_at, scrapbook_updated_by")
      .eq("id", id)
      .eq("couple_id", space.coupleId)
      .maybeSingle(),
    supabase.from("journal_photos").select("id, storage_path, thumb_path, caption, width, height").eq("journal_id", id).order("created_at"),
    // RLS returns shared reflections plus the viewer's own private ones — never the partner's private ones.
    supabase.from("journal_reflections").select("id, author_id, visibility, body, created_at").eq("journal_id", id).order("created_at"),
    supabase.from("place_journals").select("places(id, name, category)").eq("journal_id", id),
  ]);

  const journal = journalRes.data;
  if (!journal) notFound();

  const photos = photosRes.data ?? [];
  const reflections = reflectionsRes.data ?? [];
  const places = (placesRes.data ?? []).map((r) => r.places).filter((p): p is NonNullable<typeof p> => Boolean(p));
  const urls = await signMediaUrls(space, [
    ...photos.flatMap((p) => [thumbnailOf(p), p.storage_path]),
    ...space.members.map((m) => m.avatarPath),
  ]);
  const member = (userId: string | null) => space.members.find((m) => m.userId === userId);
  const author = member(journal.created_by);
  const { scrapbook, generated, saved } = scrapbookForJournal(journal, photos);

  return (
    <article className="os-sections mx-auto max-w-4xl">
      <header className="space-y-5">
        <Link href="/story" className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:-translate-x-0.5 hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden /> Our story
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-3">
            <Stamp className="text-xs">{formatCalendarDate(journal.entry_date, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</Stamp>
            <h1 className="os-display text-4xl leading-[1.05] font-medium text-ink sm:text-6xl">{journal.title}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
              {author ? <span className="os-hand text-xl text-ink">by {author.displayName}</span> : null}
              {journal.mood ? <Badge tone="accent">{journal.mood}</Badge> : null}
              {places.map((p) => (
                <Badge key={p.id}>
                  <PlaceIcon category={p.category} className="size-3" /> {p.name}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <LinkButton href={`/story/${journal.id}/edit`} variant="secondary" size="sm">
              <Pencil className="size-3.5" aria-hidden /> Edit words
            </LinkButton>
            <form action={deleteJournal}>
              <input type="hidden" name="journalId" value={journal.id} />
              <ConfirmSubmit message="Delete this entry, its scrapbook page, photos and all reflections? This can't be undone.">
                <Trash2 className="size-3.5" aria-hidden /> Delete
              </ConfirmSubmit>
            </form>
          </div>
        </div>
      </header>

      <section aria-label="Scrapbook page">
        <ScrapbookBoard
          journalId={journal.id}
          scrapbook={scrapbook}
          generated={generated}
          saved={saved}
          updatedAt={journal.scrapbook_updated_at}
          updatedByName={member(journal.scrapbook_updated_by)?.displayName ?? null}
          photos={photos.map((p) => ({
            id: p.id,
            width: p.width,
            height: p.height,
            thumb: urls[thumbnailOf(p)] ?? null,
            full: urls[p.storage_path] ?? null,
          }))}
        />
      </section>

      {journal.body ? (
        <Reveal as="section" className="relative">
          <Tape className="absolute -top-3 left-10 z-10" rotate={-6} />
          <Tape className="absolute -top-3 right-10 z-10" rotate={5} pattern="dots" color="#b5d8f0" />
          <div className="os-card relative overflow-hidden px-6 py-10 sm:px-12">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-60"
              style={{ backgroundImage: "repeating-linear-gradient(transparent 0 2.2rem, color-mix(in srgb, var(--os-primary) 14%, transparent) 2.2rem 2.25rem)" }}
            />
            <p className="os-eyebrow relative mb-3">The story</p>
            <div className="os-prose relative text-ink">{journal.body}</div>
          </div>
        </Reveal>
      ) : null}

      <section>
        <SectionTitle>Reflections</SectionTitle>
        <div className="grid gap-5 sm:grid-cols-2">
          {reflections.map((r, index) => {
            const who = member(r.author_id);
            const mine = r.author_id === space.userId;
            return (
              <Reveal key={r.id} index={index} as="article">
                <div
                  className="os-sticky relative h-full p-5 pt-6 sm:p-6"
                  style={{ "--note": NOTE_COLORS[index % NOTE_COLORS.length], "--tilt": `${index % 2 ? 1.2 : -1.2}deg` } as React.CSSProperties}
                >
                  <span aria-hidden className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_35%_35%,#ff8b8b,#c2410c)] shadow" />
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={who?.displayName ?? "?"} src={who?.avatarPath ? urls[who.avatarPath] : null} size={30} />
                      <div className="leading-tight">
                        <p className="text-sm font-semibold">{who?.displayName ?? "Former member"}</p>
                        <p className="text-xs opacity-70">{formatInstant(r.created_at, tz, { dateStyle: "medium" })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 text-[0.7rem] font-medium">
                        {r.visibility === "private" ? <Lock className="size-3" aria-hidden /> : <Users className="size-3" aria-hidden />}
                        {r.visibility === "private" ? "Only you" : "Shared"}
                      </span>
                      {mine ? (
                        <form action={deleteReflection}>
                          <input type="hidden" name="reflectionId" value={r.id} />
                          <ConfirmSubmit message="Delete this reflection?" className="rounded-full p-1.5 opacity-60 transition hover:bg-black/5 hover:opacity-100">
                            <Trash2 className="size-3.5" aria-label="Delete reflection" />
                          </ConfirmSubmit>
                        </form>
                      ) : null}
                    </div>
                  </div>
                  <p className="os-hand mt-3 text-[1.45rem] leading-snug whitespace-pre-wrap">{r.body}</p>
                </div>
              </Reveal>
            );
          })}
          <div className={reflections.length % 2 === 0 ? "sm:col-span-2" : ""}>
            <ReflectionForm journalId={journal.id} partnerName={space.partner?.displayName ?? null} />
          </div>
        </div>
      </section>

      <section>
        <SectionTitle>
          <span className="inline-flex items-center gap-2">
            <Images className="size-5 text-accent" aria-hidden /> Photo drawer
          </span>
        </SectionTitle>
        <p className="-mt-1 mb-5 text-sm text-muted">Every photo in this entry. Add captions here, or place them on the page with Decorate.</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {photos.map((photo, index) => (
            <Reveal key={photo.id} index={index}>
              <figure className="group os-polaroid relative" style={{ "--tilt": `${index % 2 ? 2 : -2}deg` } as React.CSSProperties}>
                {urls[thumbnailOf(photo)] ? (
                  <a href={urls[photo.storage_path] ?? urls[thumbnailOf(photo)]} target="_blank" rel="noreferrer" title="Open full size">
                    {/* eslint-disable-next-line @next/next/no-img-element -- signed private URL */}
                    <img src={urls[thumbnailOf(photo)]} alt={photo.caption ?? ""} loading="lazy" decoding="async" className="aspect-square w-full bg-[#efe7da] object-cover" />
                  </a>
                ) : (
                  <div className="aspect-square w-full bg-[#efe7da]" />
                )}
                <figcaption className="absolute inset-x-2 bottom-1 flex items-center justify-between gap-1">
                  <CaptionForm photoId={photo.id} caption={photo.caption} />
                  <form action={deletePhoto}>
                    <input type="hidden" name="photoId" value={photo.id} />
                    <ConfirmSubmit message="Remove this photo from the entry and its page?" className="rounded-full p-1 text-[#7a6c64] opacity-0 transition group-hover:opacity-100 hover:text-danger focus-visible:opacity-100">
                      <Trash2 className="size-3.5" aria-label="Remove photo" />
                    </ConfirmSubmit>
                  </form>
                </figcaption>
              </figure>
            </Reveal>
          ))}
          <ImageUpload target={{ kind: "journal_photo", journalId: journal.id }} multiple variant="tile" />
        </div>
        {photos.length === 0 ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted">
            <Doodle kind="arrow" className="size-6 -scale-x-100 text-accent" /> Add a few photos, then press Decorate to place them.
          </p>
        ) : null}
      </section>
    </article>
  );
}
