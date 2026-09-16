import { Lock, Pencil, Pin, PinOff, StickyNote, Trash2, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { deleteNote, toggleNotePin } from "@/app/actions/content";
import { ConfirmSubmit } from "@/components/ui/form";
import { Badge, EmptyState, PageHeader } from "@/components/ui/layout";
import { formatInstant } from "@/lib/dates";
import { requireActiveSpace } from "@/lib/tenant";
import { getViewerTimeZone } from "@/lib/timezone";
import { uuid } from "@/lib/validation";
import { NoteForm } from "./note-form";

export const metadata: Metadata = { title: "Notes" };

export default async function NotesPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const space = await requireActiveSpace();
  const tz = await getViewerTimeZone();

  // RLS: your own notes (private or shared) plus notes your partner shared.
  const { data } = await space.supabase
    .from("notes")
    .select("id, title, body, visibility, pinned, author_id, updated_at")
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  const notes = data ?? [];
  const editing = uuid.safeParse(edit).success ? notes.find((n) => n.id === edit && n.author_id === space.userId) : undefined;
  const nameOf = (id: string) => space.members.find((m) => m.userId === id)?.displayName ?? "Former member";

  return (
    <div className="os-sections">
      <PageHeader
        eyebrow="Notes"
        title="Little things worth keeping"
        description="Gift ideas, inside jokes, lists for later. Keep a note to yourself, or share it."
      />

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
        <div>
          {notes.length === 0 ? (
            <EmptyState icon={<StickyNote className="size-5" />} title="No notes yet">
              Private notes are only ever visible to you.
            </EmptyState>
          ) : (
            <ul className="columns-1 gap-[var(--os-gap)] sm:columns-2">
              {notes.map((n) => {
                const mine = n.author_id === space.userId;
                return (
                  <li key={n.id} className="os-card mb-[var(--os-gap)] break-inside-avoid p-5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {n.pinned ? <Pin className="size-3.5 text-accent" aria-label="Pinned" /> : null}
                        {n.visibility === "private" ? (
                          <Badge>
                            <Lock className="size-3" aria-hidden /> Only you
                          </Badge>
                        ) : (
                          <Badge tone="accent">
                            <Users className="size-3" aria-hidden /> {mine ? "Shared" : `From ${nameOf(n.author_id)}`}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted">{formatInstant(n.updated_at, tz, { month: "short", day: "numeric" })}</span>
                    </div>
                    {n.title ? <h2 className="os-display mt-3 text-xl leading-snug text-ink">{n.title}</h2> : null}
                    <p className="mt-2 leading-relaxed whitespace-pre-wrap text-ink/90">{n.body}</p>
                    {mine ? (
                      <div className="mt-4 flex gap-1">
                        <form action={toggleNotePin}>
                          <input type="hidden" name="noteId" value={n.id} />
                          <input type="hidden" name="pinned" value={String(!n.pinned)} />
                          <button type="submit" className="rounded-full p-2 text-muted hover:bg-accent-soft hover:text-ink">
                            {n.pinned ? <PinOff className="size-3.5" aria-label="Unpin" /> : <Pin className="size-3.5" aria-label="Pin" />}
                          </button>
                        </form>
                        <Link href={`/notes?edit=${n.id}`} className="rounded-full p-2 text-muted hover:bg-accent-soft hover:text-ink">
                          <Pencil className="size-3.5" aria-label="Edit" />
                        </Link>
                        <form action={deleteNote}>
                          <input type="hidden" name="noteId" value={n.id} />
                          <ConfirmSubmit message="Delete this note?" className="rounded-full p-2 text-muted hover:bg-danger/10 hover:text-danger">
                            <Trash2 className="size-3.5" aria-label="Delete" />
                          </ConfirmSubmit>
                        </form>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="lg:sticky lg:top-20">
          <NoteForm key={editing?.id ?? "new"} note={editing} partnerName={space.partner?.displayName ?? null} />
        </div>
      </div>
    </div>
  );
}
