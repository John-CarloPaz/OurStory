"use client";

import { Lock, Pin, Users } from "lucide-react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { saveNote } from "@/app/actions/content";
import { buttonClass } from "@/components/ui/button";
import { Field, FormMessage, Input, SubmitButton, Textarea } from "@/components/ui/form";
import { IDLE } from "@/lib/forms";
import { useFormAction } from "@/components/ui/use-form-action";

type Note = { id: string; title: string | null; body: string; visibility: string; pinned: boolean };

/**
 * The pad is paper: dark ink in every theme. Re-pointing the tokens keeps the
 * shared Field/Input/Textarea legible on it, including on the Midnight theme.
 */
const PAD_STYLE = {
  "--note": "#fff0a0",
  "--tilt": "0deg",
  "--os-ink": "#3b2f2a",
  "--os-muted": "#6f6058",
  "--os-line": "rgb(59 47 42 / 0.16)",
  "--os-field": "#fffbe0",
} as CSSProperties;

const LINE_INPUT =
  "os-hand !h-11 !rounded-none !border-0 !border-b-2 !border-dashed !border-[#3b2f2a]/25 !bg-transparent !px-0.5 !text-2xl !shadow-none !ring-0 " +
  "focus:!border-solid focus:!border-[#3b2f2a]/60 aria-[invalid=true]:!border-danger";

const LINED_TEXTAREA = "os-hand !rounded-none !border-0 !bg-transparent !px-0.5 !py-0 !text-[1.45rem] !leading-[2rem] !shadow-none !ring-0 bg-local";

const RULES =
  "repeating-linear-gradient(to bottom, transparent 0 calc(0.86lh - 1px), rgb(59 47 42 / 0.14) calc(0.86lh - 1px) 0.86lh, transparent 0.86lh 1lh)";

const PILL =
  "inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line px-3.5 text-sm text-muted transition hover:text-ink " +
  "peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:font-medium peer-checked:text-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent";

export function NoteForm({ note, partnerName }: { note?: Note; partnerName: string | null }) {
  const { state, pending, formProps } = useFormAction(saveNote, IDLE, { resetOnSuccess: !note });

  return (
    <form {...formProps} className="os-card relative space-y-5 p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="os-display text-2xl text-ink">{note ? "Edit note" : "New note"}</h2>
        <span aria-hidden className="os-hand -rotate-3 text-xl text-accent">
          {note ? "a little fix" : "jot it down"}
        </span>
      </div>
      {note ? <input type="hidden" name="noteId" value={note.id} /> : null}

      {/* A sticky-note pad */}
      <div className="relative px-1 pt-1 pb-3">
        <span aria-hidden className="pointer-events-none absolute inset-x-3 top-3 bottom-0 rotate-[2.2deg] rounded-sm bg-[#f1d86e] shadow-sm" />
        <span aria-hidden className="pointer-events-none absolute inset-x-2 top-2 bottom-1.5 -rotate-[1.4deg] rounded-sm bg-[#f8e585]" />
        <div
          className="os-sticky relative space-y-3 px-4 pt-6 pb-4 outline-offset-2 focus-within:outline-2 focus-within:outline-accent/60 [&_label]:font-typewriter [&_label]:text-[0.7rem] [&_label]:tracking-[0.14em] [&_label]:uppercase"
          style={PAD_STYLE}
        >
          <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-4 bg-linear-to-b from-black/[0.07] to-transparent" />
          <Field label="Title" name="title" state={state} optional>
            <Input name="title" maxLength={160} defaultValue={note?.title ?? ""} state={state} className={LINE_INPUT} />
          </Field>
          <Field label="Note" name="body" state={state}>
            <Textarea
              name="body"
              required
              rows={5}
              maxLength={20000}
              defaultValue={note?.body}
              state={state}
              className={LINED_TEXTAREA}
              style={{ backgroundImage: RULES }}
            />
          </Field>
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-ink">Who can see it</legend>
        <div className="flex flex-wrap gap-2">
          <label className="cursor-pointer">
            <input
              type="radio"
              name="visibility"
              value="private"
              defaultChecked={(note?.visibility ?? "private") === "private"}
              className="peer sr-only"
            />
            <span className={PILL}>
              <Lock className="size-3.5" aria-hidden /> Only me
            </span>
          </label>
          <label className="cursor-pointer">
            <input type="radio" name="visibility" value="shared" defaultChecked={note?.visibility === "shared"} className="peer sr-only" />
            <span className={PILL}>
              <Users className="size-3.5" aria-hidden /> {partnerName ? `Me and ${partnerName}` : "Both of us"}
            </span>
          </label>
        </div>
      </fieldset>
      <label className="flex cursor-pointer">
        <input type="checkbox" name="pinned" defaultChecked={note?.pinned} className="peer sr-only" />
        <span className={PILL}>
          <Pin className="size-3.5" aria-hidden /> Pin to the top
        </span>
      </label>
      <FormMessage state={state} />
      <div className="flex items-center gap-3">
        <SubmitButton pending={pending} pendingText="Saving…">
          {note ? "Save" : "Add note"}
        </SubmitButton>
        {note ? (
          <Link href="/notes" className={buttonClass("ghost")}>
            Cancel
          </Link>
        ) : null}
      </div>
    </form>
  );
}
