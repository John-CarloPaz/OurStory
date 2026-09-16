import { ArrowLeft, Lock, Pencil, Trash2, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteJournal, deletePhoto, deleteReflection } from "@/app/actions/journals";
import { PlaceIcon } from "@/components/content-meta";
import { ImageUpload } from "@/components/image-upload";
import { LinkButton } from "@/components/ui/button";
import { ConfirmSubmit } from "@/components/ui/form";
import { Avatar, Badge, Card, SectionTitle } from "@/components/ui/layout";
import { formatCalendarDate, formatInstant } from "@/lib/dates";
import { signMediaUrls, thumbnailOf } from "@/lib/storage/media";
import { requireActiveSpace } from "@/lib/tenant";
import { getViewerTimeZone } from "@/lib/timezone";
import { uuid } from "@/lib/validation";
import { CaptionForm, ReflectionForm } from "./journal-detail-forms";

export const metadata: Metadata = { title: "Entry" };

export default async function JournalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();

  const space = await requireActiveSpace();
  const tz = await getViewerTimeZone();
  const { supabase } = space;

  const [journalRes, photosRes, reflectionsRes, placesRes] = await Promise.all([
    supabase.from("journals").select("id, title, entry_date, mood, body, created_by, created_at").eq("id", id).maybeSingle(),
    supabase.from("journal_photos").select("id, storage_path, thumb_path, caption").eq("journal_id", id).order("created_at"),
    // RLS returns shared reflections plus the viewer's own private ones — never the partner's private ones.
    supabase.from("journal_reflections").select("id, author_id, visibility, body, created_at").eq("journal_id", id).order("created_at"),
    supabase.from("place_journals").select("places(id, name, category)").eq("journal_id", id),
  ]);

  const journal = journalRes.data;
  if (!journal) notFound();

  const photos = photosRes.data ?? [];
  const reflections = reflectionsRes.data ?? [];
  const places = (placesRes.data ?? []).map((r) => r.places).filter(Boolean);
  const urls = await signMediaUrls(space, [
    ...photos.flatMap((p) => [thumbnailOf(p), p.storage_path]),
    ...space.members.map((m) => m.avatarPath),
  ]);
  const member = (userId: string | null) => space.members.find((m) => m.userId === userId);
  const author = member(journal.created_by);

  return (
    <article className="os-sections mx-auto max-w-3xl">
      <div className="space-y-6">
        <Link href="/story" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden /> Story
        </Link>
        <header className="space-y-3">
          <p className="os-eyebrow">{formatCalendarDate(journal.entry_date, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          <h1 className="os-display text-4xl leading-[1.08] font-medium text-ink sm:text-5xl">{journal.title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            {author ? <span>Written by {author.displayName}</span> : null}
            {journal.mood ? <Badge tone="accent">{journal.mood}</Badge> : null}
            {places.map((p) => (
              <Badge key={p!.id}>
                <PlaceIcon category={p!.category} className="size-3" /> {p!.name}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <LinkButton href={`/story/${journal.id}/edit`} variant="secondary" size="sm">
              <Pencil className="size-3.5" aria-hidden /> Edit
            </LinkButton>
            <form action={deleteJournal}>
              <input type="hidden" name="journalId" value={journal.id} />
              <ConfirmSubmit message="Delete this entry, its photos and all reflections? This can't be undone.">
                <Trash2 className="size-3.5" aria-hidden /> Delete
              </ConfirmSubmit>
            </form>
          </div>
        </header>
        {journal.body ? <div className="os-prose text-ink">{journal.body}</div> : null}
      </div>

      <section>
        <SectionTitle>Photos</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => (
            <figure key={photo.id} className="group relative">
              {urls[thumbnailOf(photo)] ? (
                <a href={urls[photo.storage_path] ?? urls[thumbnailOf(photo)]} target="_blank" rel="noreferrer" title="Open full size">
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed private URL */}
                  <img src={urls[thumbnailOf(photo)]} alt={photo.caption ?? ""} decoding="async" className="aspect-square w-full rounded-2xl bg-accent-soft object-cover" />
                </a>
              ) : (
                <div className="aspect-square w-full rounded-2xl bg-accent-soft" />
              )}
              <figcaption className="mt-1.5 flex items-start justify-between gap-2">
                <CaptionForm photoId={photo.id} caption={photo.caption} />
                <form action={deletePhoto}>
                  <input type="hidden" name="photoId" value={photo.id} />
                  <ConfirmSubmit message="Remove this photo?" className="rounded-full p-1.5 text-muted hover:bg-danger/10 hover:text-danger">
                    <Trash2 className="size-3.5" aria-label="Remove photo" />
                  </ConfirmSubmit>
                </form>
              </figcaption>
            </figure>
          ))}
          <ImageUpload target={{ kind: "journal_photo", journalId: journal.id }} multiple variant="tile" />
        </div>
      </section>

      <section>
        <SectionTitle>Reflections</SectionTitle>
        <div className="space-y-[var(--os-gap)]">
          {reflections.map((r) => {
            const who = member(r.author_id);
            const mine = r.author_id === space.userId;
            return (
              <Card key={r.id} as="article" className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={who?.displayName ?? "?"} src={who?.avatarPath ? urls[who.avatarPath] : null} size={32} />
                    <div>
                      <p className="text-sm font-medium text-ink">{who?.displayName ?? "Former member"}</p>
                      <p className="text-xs text-muted">{formatInstant(r.created_at, tz, { dateStyle: "medium" })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.visibility === "private" ? (
                      <Badge>
                        <Lock className="size-3" aria-hidden /> Only you
                      </Badge>
                    ) : (
                      <Badge tone="accent">
                        <Users className="size-3" aria-hidden /> Shared
                      </Badge>
                    )}
                    {mine ? (
                      <form action={deleteReflection}>
                        <input type="hidden" name="reflectionId" value={r.id} />
                        <ConfirmSubmit message="Delete this reflection?" className="rounded-full p-1.5 text-muted hover:bg-danger/10 hover:text-danger">
                          <Trash2 className="size-3.5" aria-label="Delete reflection" />
                        </ConfirmSubmit>
                      </form>
                    ) : null}
                  </div>
                </div>
                <p className="os-prose mt-4 !text-base text-ink">{r.body}</p>
              </Card>
            );
          })}
          <ReflectionForm journalId={journal.id} partnerName={space.partner?.displayName ?? null} />
        </div>
      </section>
    </article>
  );
}
