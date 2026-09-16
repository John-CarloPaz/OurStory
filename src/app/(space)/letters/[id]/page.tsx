import { ArrowLeft, Lock, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteLetter } from "@/app/actions/content";
import { ConfirmSubmit } from "@/components/ui/form";
import { currentTimeMs, formatInstant, utcToZonedParts } from "@/lib/dates";
import { requireActiveSpace } from "@/lib/tenant";
import { getViewerTimeZone } from "@/lib/timezone";
import { uuid } from "@/lib/validation";
import { LetterForm } from "../letter-form";
import { MarkOpened } from "./mark-opened";

export const metadata: Metadata = { title: "Letter" };

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
    space.supabase.from("letters").select("id, title, unlock_at, opened_at, author_id, recipient_id, created_at").eq("id", id).maybeSingle(),
    // For a recipient, RLS returns nothing here until unlock_at has passed.
    space.supabase.from("letter_contents").select("content").eq("letter_id", id).maybeSingle(),
  ]);

  const letter = letterRes.data;
  if (!letter) notFound();

  const isAuthor = letter.author_id === space.userId;
  const sealed = Date.parse(letter.unlock_at) > currentTimeMs();
  const content = contentRes.data?.content ?? null;
  const nameOf = (userId: string) => space.members.find((m) => m.userId === userId)?.displayName ?? "Your partner";

  if (isAuthor && sealed && edit === "1" && content !== null) {
    const unlock = utcToZonedParts(letter.unlock_at, tz);
    return (
      <div className="mx-auto max-w-3xl space-y-8">
        <Link href={`/letters/${letter.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
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
      <Link href="/letters" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Letters
      </Link>

      {content === null ? (
        <div className="os-card px-8 py-16 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-accent-soft text-accent">
            <Lock className="size-6" aria-hidden />
          </div>
          <p className="os-display mt-6 text-3xl text-ink">A letter is waiting for you.</p>
          <p className="mt-2 text-muted">
            From {nameOf(letter.author_id)} · “{letter.title}”
          </p>
          <p className="mt-6 font-medium text-accent">Opens {formatInstant(letter.unlock_at, tz, { dateStyle: "full", timeStyle: "short" })}.</p>
        </div>
      ) : (
        <article className="os-card px-7 py-10 sm:px-12 sm:py-14">
          {!isAuthor && !letter.opened_at ? <MarkOpened letterId={letter.id} /> : null}
          <p className="os-eyebrow">{formatInstant(letter.unlock_at, tz, { dateStyle: "long" })}</p>
          <h1 className="os-display mt-3 text-4xl leading-tight text-ink">{letter.title}</h1>
          <p className="os-display mt-8 text-xl text-ink">Dear {nameOf(letter.recipient_id)},</p>
          <div className="os-prose mt-4 text-ink">{content}</div>
          <p className="os-display mt-10 text-xl text-ink">— {nameOf(letter.author_id)}</p>

          {isAuthor ? (
            <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-line pt-6 text-sm text-muted">
              <span className="flex-1">
                {sealed
                  ? `Sealed. ${nameOf(letter.recipient_id)} can read it from ${formatInstant(letter.unlock_at, tz, { dateStyle: "medium", timeStyle: "short" })}.`
                  : letter.opened_at
                    ? `${nameOf(letter.recipient_id)} opened it ${formatInstant(letter.opened_at, tz, { dateStyle: "medium" })}.`
                    : "Delivered, not opened yet."}
              </span>
              {sealed ? (
                <Link href={`/letters/${letter.id}?edit=1`} className="rounded-full border border-line px-3.5 py-1.5 text-ink hover:border-accent/60">
                  Edit
                </Link>
              ) : null}
              <form action={deleteLetter}>
                <input type="hidden" name="letterId" value={letter.id} />
                <ConfirmSubmit message="Delete this letter for both of you?">
                  <Trash2 className="size-3.5" aria-hidden /> Delete
                </ConfirmSubmit>
              </form>
            </div>
          ) : null}
        </article>
      )}
    </div>
  );
}
