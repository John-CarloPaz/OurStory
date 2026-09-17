import { ArrowLeft, Lock, Pencil, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteLetter } from "@/app/actions/content";
import { Doodle } from "@/components/decor/materials";
import { buttonClass } from "@/components/ui/button";
import { ConfirmSubmit } from "@/components/ui/form";
import { currentTimeMs, formatInstant, utcToZonedParts } from "@/lib/dates";
import { requireActiveSpace } from "@/lib/tenant";
import { getViewerTimeZone } from "@/lib/timezone";
import { uuid } from "@/lib/validation";
import { LetterForm } from "../letter-form";
import { Envelope, LetterMotion, OpenedEnvelope, Postmark, RULED_LINES } from "../stationery";
import { MarkOpened } from "./mark-opened";

export const metadata: Metadata = { title: "Letter" };

/** Writing paper: warm white, folded in thirds, with a red margin rule. */
const SHEET_STYLE: CSSProperties = {
  backgroundColor: "#fffaf1",
  backgroundImage: [
    "linear-gradient(to bottom, transparent calc(33.3% - 1px), rgb(120 90 60 / 0.08) calc(33.3% - 1px) 33.3%, rgb(255 255 255 / 0.9) 33.3% calc(33.3% + 1px), transparent calc(33.3% + 1px))",
    "linear-gradient(to bottom, transparent calc(66.6% - 1px), rgb(120 90 60 / 0.08) calc(66.6% - 1px) 66.6%, rgb(255 255 255 / 0.9) 66.6% calc(66.6% + 1px), transparent calc(66.6% + 1px))",
    "linear-gradient(90deg, transparent var(--margin), rgb(214 92 92 / 0.35) var(--margin) calc(var(--margin) + 1.5px), transparent calc(var(--margin) + 1.5px))",
  ].join(", "),
  boxShadow: "0 1px 0 rgb(255 255 255 / 0.7) inset, 0 2px 6px rgb(40 25 10 / 0.08), 0 30px 60px -30px rgb(40 25 10 / 0.5)",
  animation: "os-letter-draw 0.9s var(--os-ease-out) 0.6s both",
};

export default async function LetterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;
  if (!uuid.safeParse(id).success) notFound();

  const space = await requireActiveSpace();
  const tz = await getViewerTimeZone();

  const [letterRes, contentRes] = await Promise.all([
    space.supabase.from("letters").select("id, title, unlock_at, opened_at, author_id, recipient_id, created_at").eq("id", id).eq("couple_id", space.coupleId).maybeSingle(),
    // For a recipient, RLS returns nothing here until unlock_at has passed.
    space.supabase.from("letter_contents").select("content").eq("letter_id", id).maybeSingle(),
  ]);

  const letter = letterRes.data;
  if (!letter) notFound();

  const isAuthor = letter.author_id === space.userId;
  const sealed = Date.parse(letter.unlock_at) > currentTimeMs();
  const content = contentRes.data?.content ?? null;
  const nameOf = (userId: string) => space.members.find((m) => m.userId === userId)?.displayName ?? "Your partner";
  const authorName = space.members.find((m) => m.userId === letter.author_id)?.displayName.trim();
  const authorInitial = authorName ? Array.from(authorName)[0].toUpperCase() : undefined;

  if (isAuthor && sealed && edit === "1" && content !== null) {
    const unlock = utcToZonedParts(letter.unlock_at, tz);
    return (
      <div className="mx-auto max-w-3xl space-y-8">
        <Link
          href={`/letters/${letter.id}`}
          className="inline-flex min-h-10 items-center gap-1.5 text-sm text-muted transition hover:-translate-x-0.5 hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden /> Back
        </Link>
        <LetterForm
          letter={{ id: letter.id, title: letter.title, content, unlockDate: unlock.date, unlockTime: unlock.time }}
          recipientName={nameOf(letter.recipient_id)}
          defaultUnlockDate={unlock.date}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <Link href="/letters" className="inline-flex min-h-10 items-center gap-1.5 text-sm text-muted transition hover:-translate-x-0.5 hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Letters
      </Link>

      {content === null ? (
        <section className="relative pb-4 text-center">
          <p className="os-eyebrow">Still sealed</p>
          <h1 className="os-display mt-3 text-3xl leading-tight font-medium text-ink sm:text-4xl">A letter is waiting for you.</h1>
          <div className="relative mx-auto mt-10 max-w-md">
            <div className="os-float" style={{ "--tilt": "-1.5deg" } as CSSProperties}>
              <Envelope state="sealed" size="lg" initial={authorInitial}>
                <p className="os-hand text-2xl leading-tight opacity-80">From {nameOf(letter.author_id)}</p>
                <p className="os-hand text-[2rem] leading-[1.1] break-words">“{letter.title}”</p>
                <Postmark
                  className="mt-4"
                  label={
                    <>
                      <Lock className="size-3" aria-hidden /> Opens
                    </>
                  }
                >
                  {formatInstant(letter.unlock_at, tz, { dateStyle: "full", timeStyle: "short" })}
                </Postmark>
              </Envelope>
            </div>
            <div aria-hidden className="pointer-events-none mx-auto mt-6 h-3 w-2/3 rounded-[50%] bg-black/20 blur-md" />
          </div>
        </section>
      ) : (
        <div className="relative">
          <LetterMotion />
          <OpenedEnvelope
            initial={authorInitial}
            className="absolute top-0 left-1/2 w-60 -translate-x-1/2 animate-[os-pop_0.5s_var(--os-ease-spring)_backwards] sm:w-72"
          />
          <article
            className="relative z-10 mt-[9rem] rounded-[4px] px-6 pt-10 pb-12 text-[#3b2f2a] [--margin:0.85rem] sm:mt-[10.8rem] sm:px-14 sm:pt-14 sm:pb-16 sm:[--margin:2.6rem]"
            style={SHEET_STYLE}
          >
            {!isAuthor && !letter.opened_at ? <MarkOpened letterId={letter.id} /> : null}
            <p className="font-typewriter text-xs tracking-[0.16em] uppercase opacity-70">{formatInstant(letter.unlock_at, tz, { dateStyle: "long" })}</p>
            <h1 className="os-display mt-3 text-3xl leading-tight font-medium break-words sm:text-4xl">{letter.title}</h1>
            <p className="os-hand mt-8 text-[2rem] leading-none">Dear {nameOf(letter.recipient_id)},</p>
            <div className="os-prose mt-4" style={{ backgroundImage: RULED_LINES }}>
              {content}
            </div>
            <p className="os-hand mt-10 flex items-center justify-end gap-2 text-[2.1rem] leading-none">
              — {nameOf(letter.author_id)}
              <Doodle kind="heart" className="size-7 text-[#c75c5c]" />
            </p>
          </article>

          {isAuthor ? (
            <div className="os-glass relative z-10 mt-6 flex animate-[os-fade-up_0.6s_var(--os-ease-out)_1.1s_backwards] flex-wrap items-center gap-3 rounded-3xl px-5 py-4 text-sm text-muted">
              <span className="min-w-[min(100%,14rem)] flex-1">
                {sealed
                  ? `Sealed. ${nameOf(letter.recipient_id)} can read it from ${formatInstant(letter.unlock_at, tz, { dateStyle: "medium", timeStyle: "short" })}.`
                  : letter.opened_at
                    ? `${nameOf(letter.recipient_id)} opened it ${formatInstant(letter.opened_at, tz, { dateStyle: "medium" })}.`
                    : "Delivered, not opened yet."}
              </span>
              <div className="flex items-center gap-2">
                {sealed ? (
                  <Link href={`/letters/${letter.id}?edit=1`} className={buttonClass("secondary", "sm", "!h-10")}>
                    <Pencil className="size-3.5" aria-hidden /> Edit
                  </Link>
                ) : null}
                <form action={deleteLetter}>
                  <input type="hidden" name="letterId" value={letter.id} />
                  <ConfirmSubmit message="Delete this letter for both of you?" className={buttonClass("danger", "sm", "!h-10")}>
                    <Trash2 className="size-3.5" aria-hidden /> Delete
                  </ConfirmSubmit>
                </form>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
