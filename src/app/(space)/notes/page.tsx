import { Lock, Pencil, Pin, PinOff, StickyNote, Trash2, Users } from "lucide-react";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { deleteNote, toggleNotePin } from "@/app/actions/content";
import { Tape } from "@/components/decor/materials";
import { ConfirmSubmit } from "@/components/ui/form";
import { EmptyState, PageHeader, Reveal } from "@/components/ui/layout";
import { formatInstant } from "@/lib/dates";
import { requireActiveSpace } from "@/lib/tenant";
import { getViewerTimeZone } from "@/lib/timezone";
import { uuid } from "@/lib/validation";
import { NoteForm } from "./note-form";

export const metadata: Metadata = { title: "Notes" };

const NOTE_COLORS = ["#fff0a0", "#fbd3dc", "#d6ebd3", "#d6e7f6", "#e7dcf6", "#ffdcc0"];
const NOTE_TILTS = [-2, 1.4, -0.8, 1.9, -1.4, 0.7];

/** A stable number per note, so its color and tilt never change between renders. */
function noteSeed(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash;
}

const NOTE_ACTION =
  "grid size-10 place-items-center rounded-full text-[#3b2f2a]/70 transition active:scale-95 hover:bg-black/[0.07] hover:text-[#3b2f2a]";
const NOTE_DELETE = "grid size-10 place-items-center rounded-full text-[#3b2f2a]/70 transition active:scale-95 hover:bg-danger/10 hover:text-danger";

function Pushpin() {
  return (
    <span aria-hidden className="pointer-events-none absolute -top-3 left-1/2 z-10 -translate-x-1/2">
      <span className="absolute top-3 left-2.5 h-2 w-3.5 rounded-full bg-black/25 blur-[2px]" />
      <span className="relative block size-5 rounded-full bg-[radial-gradient(circle_at_35%_30%,color-mix(in_srgb,var(--os-primary)_35%,#fff)_0_18%,var(--os-primary)_55%,color-mix(in_srgb,var(--os-primary)_55%,#000))] shadow-[0_2px_3px_rgb(0_0_0/0.35)]" />
    </span>
  );
}

export default async function NotesPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const space = await requireActiveSpace();
  const tz = await getViewerTimeZone();

  // RLS: your own notes (private or shared) plus notes your partner shared.
  const { data } = await space.supabase
    .from("notes")
    .select("id, title, body, visibility, pinned, author_id, updated_at")
    .eq("couple_id", space.coupleId)
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
        note="stick it here"
        description="Gift ideas, inside jokes, lists for later. Keep a note to yourself, or share it."
      />

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
        <div>
          {notes.length === 0 ? (
            <EmptyState icon={<StickyNote className="size-5" />} title="No notes yet">
              Private notes are only ever visible to you.
            </EmptyState>
          ) : (
            <div
              className="@container rounded-[1.75rem] p-2 shadow-[0_24px_50px_-28px_rgb(40_25_10/0.7)] sm:p-2.5"
              style={{ background: "linear-gradient(145deg, #bb8a5c, #8e5f37)" }}
            >
              <ul
                data-paper="cork"
                className="os-paper min-h-72 columns-1 gap-6 rounded-[1.3rem] px-4 pt-7 pb-1 sm:columns-2 sm:px-6"
                style={
                  {
                    "--paper": "#c9a075",
                    boxShadow: "inset 0 2px 10px rgb(40 20 5 / 0.45), inset 0 0 0 1px rgb(40 20 5 / 0.2)",
                  } as CSSProperties
                }
              >
                {notes.map((n, index) => {
                  const mine = n.author_id === space.userId;
                  const seed = noteSeed(n.id);
                  const tilt = NOTE_TILTS[(seed >>> 3) % NOTE_TILTS.length];
                  return (
                    <Reveal key={n.id} as="li" index={index % 6} className="mb-7 break-inside-avoid pt-2">
                      <article
                        className={`os-sticky relative px-4 pt-5 pb-1 sm:px-5 ${
                          editing?.id === n.id ? "outline-2 outline-offset-4 outline-white/85 outline-dashed" : ""
                        }`}
                        style={{ "--note": NOTE_COLORS[seed % NOTE_COLORS.length], "--tilt": `${tilt}deg` } as CSSProperties}
                      >
                        {n.pinned ? (
                          <>
                            <Pushpin />
                            <span className="sr-only">Pinned</span>
                          </>
                        ) : (
                          <Tape className="absolute -top-3 left-1/2 !h-5 !w-20 -translate-x-1/2" rotate={tilt * -1.5} color="rgb(255 255 255 / 0.7)" pattern="grid" />
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                          {n.visibility === "private" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.07] px-2 py-0.5 text-[0.7rem] font-medium">
                              <Lock className="size-3" aria-hidden /> Only you
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.07] px-2 py-0.5 text-[0.7rem] font-medium">
                              <Users className="size-3" aria-hidden /> {mine ? "Shared" : `From ${nameOf(n.author_id)}`}
                            </span>
                          )}
                          <span className="font-typewriter text-[0.68rem] tracking-wider uppercase opacity-65">
                            {formatInstant(n.updated_at, tz, { month: "short", day: "numeric" })}
                          </span>
                        </div>
                        {n.title ? <h2 className="os-display mt-3 text-xl leading-snug font-semibold break-words">{n.title}</h2> : null}
                        <p className={`os-hand text-[1.4rem] leading-[1.2] break-words whitespace-pre-wrap ${n.title ? "mt-1" : "mt-3"} ${mine ? "" : "pb-3"}`}>
                          {n.body}
                        </p>
                        {mine ? (
                          <div className="-mx-2 mt-2 flex items-center justify-end gap-0.5 border-t border-dashed border-[#3b2f2a]/15 pt-1">
                            <form action={toggleNotePin}>
                              <input type="hidden" name="noteId" value={n.id} />
                              <input type="hidden" name="pinned" value={String(!n.pinned)} />
                              <button type="submit" className={NOTE_ACTION}>
                                {n.pinned ? <PinOff className="size-4" aria-label="Unpin" /> : <Pin className="size-4" aria-label="Pin" />}
                              </button>
                            </form>
                            <Link href={`/notes?edit=${n.id}`} className={NOTE_ACTION}>
                              <Pencil className="size-4" aria-label="Edit" />
                            </Link>
                            <form action={deleteNote}>
                              <input type="hidden" name="noteId" value={n.id} />
                              <ConfirmSubmit message="Delete this note?" className={NOTE_DELETE}>
                                <Trash2 className="size-4" aria-label="Delete" />
                              </ConfirmSubmit>
                            </form>
                          </div>
                        ) : null}
                      </article>
                    </Reveal>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
        <div className="lg:sticky lg:top-20">
          <NoteForm key={editing?.id ?? "new"} note={editing} partnerName={space.partner?.displayName ?? null} />
        </div>
      </div>
    </div>
  );
}
