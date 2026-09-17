"use client";

import { CalendarClock, Lock } from "lucide-react";
import Link from "next/link";
import { saveLetter } from "@/app/actions/content";
import { Tape } from "@/components/decor/materials";
import { buttonClass } from "@/components/ui/button";
import { Field, FormMessage, Input, SubmitButton, Textarea } from "@/components/ui/form";
import { IDLE } from "@/lib/forms";
import { useFormAction } from "@/components/ui/use-form-action";
import { AIRMAIL_BORDER, PAPER_TOKENS, PostageStamp, RULED_LINES } from "./stationery";

type Letter = { id: string; title: string; content: string; unlockDate: string; unlockTime: string };

/** Turns the shared input into a handwritten address line on the envelope. */
const ADDRESS_LINE =
  "os-hand !h-12 !rounded-none !border-0 !border-b-2 !border-dashed !border-[#3b2f2a]/25 !bg-transparent !px-1 !text-[1.65rem] !shadow-none !ring-0 " +
  "focus:!border-solid focus:!border-[#3b2f2a]/70 aria-[invalid=true]:!border-danger";

/** Turns the shared textarea into writing on lined paper. */
const SHEET_TEXT =
  "os-prose !rounded-none !border-0 !bg-transparent !px-0 !py-0 !text-lg !leading-[2rem] !shadow-none !ring-0 bg-local";

export function LetterForm({
  letter,
  recipientName,
  defaultUnlockDate,
}: {
  letter?: Letter;
  recipientName: string;
  defaultUnlockDate: string;
}) {
  const { state, pending, formProps } = useFormAction(saveLetter, IDLE);

  return (
    <form {...formProps} className="space-y-8">
      {letter ? <input type="hidden" name="letterId" value={letter.id} /> : null}

      {/* The envelope */}
      <div className="rounded-[1.4rem] p-1.5 shadow-[0_18px_40px_-24px_rgb(40_25_10/0.55)]" style={{ backgroundImage: AIRMAIL_BORDER }}>
        <div
          className="relative rounded-[1.05rem] bg-[#fbf3e4] px-5 pt-5 pb-5 sm:px-8 sm:pt-7 [&_label]:font-typewriter [&_label]:text-[0.72rem] [&_label]:tracking-[0.16em] [&_label]:uppercase"
          style={PAPER_TOKENS}
        >
          <PostageStamp className="absolute -top-3 right-4 sm:top-5 sm:right-7" />
          <div className="sm:pr-24">
            <Field label="On the envelope" name="title" state={state} hint={`${recipientName} can see this before the letter opens.`}>
              <Input
                name="title"
                required
                maxLength={160}
                defaultValue={letter?.title}
                placeholder="Open when you miss me"
                state={state}
                className={ADDRESS_LINE}
              />
            </Field>
          </div>
        </div>
      </div>

      {/* The letter itself */}
      <div className="relative">
        <Tape className="absolute -top-3 left-1/2 z-10 -translate-x-1/2" rotate={-3} pattern="dots" />
        <div
          className="relative rounded-[4px] bg-[#fffaf1] px-5 pt-9 pb-6 shadow-[0_2px_6px_rgb(40_25_10/0.08),0_30px_60px_-30px_rgb(40_25_10/0.5)] outline-offset-4 transition focus-within:outline-2 focus-within:outline-accent/60 sm:px-12 sm:pt-11 sm:pb-8 [&_label]:font-hand [&_label]:text-[2rem] [&_label]:leading-tight [&_label]:font-normal"
          style={PAPER_TOKENS}
        >
          <Field label={`Dear ${recipientName},`} name="content" state={state} hint="Sealed until the day you choose.">
            <Textarea
              name="content"
              required
              rows={14}
              maxLength={50000}
              defaultValue={letter?.content}
              className={SHEET_TEXT}
              style={{ backgroundImage: RULED_LINES }}
              state={state}
            />
          </Field>
        </div>
      </div>

      {/* The postmark: when it opens */}
      <div className="os-card relative overflow-hidden p-5 sm:p-7">
        <svg
          aria-hidden
          viewBox="0 0 120 120"
          fill="none"
          stroke="currentColor"
          className="pointer-events-none absolute -top-8 -right-8 size-36 -rotate-12 text-accent/20"
        >
          <circle cx="60" cy="60" r="44" strokeWidth="3" />
          <circle cx="60" cy="60" r="35" strokeWidth="1.5" strokeDasharray="4 4" />
          <path d="M-6 52c10-6 18 6 28 0s18-6 28 0 18 6 28 0 18-6 28 0 18 6 28 0M-6 68c10-6 18 6 28 0s18-6 28 0 18 6 28 0 18-6 28 0 18 6 28 0" strokeWidth="2" />
        </svg>
        <p className="os-eyebrow relative flex items-center gap-1.5">
          <CalendarClock className="size-3.5" aria-hidden /> Postmark
        </p>
        <p className="os-hand relative mt-1 text-2xl text-ink">When should it open?</p>
        <div className="relative mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Opens on" name="unlockDate" state={state}>
            <Input
              name="unlockDate"
              type="date"
              required
              defaultValue={letter?.unlockDate ?? defaultUnlockDate}
              state={state}
              className="font-typewriter tracking-wide"
            />
          </Field>
          <Field label="At" name="unlockTime" state={state}>
            <Input name="unlockTime" type="time" required defaultValue={letter?.unlockTime ?? "09:00"} state={state} className="font-typewriter tracking-wide" />
          </Field>
        </div>
        <div className="relative mt-6 space-y-4 border-t border-dashed border-line pt-5">
          <FormMessage state={state} />
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton pending={pending} pendingText="Sealing…">
              <Lock className="size-4" aria-hidden /> {letter ? "Save letter" : "Seal letter"}
            </SubmitButton>
            <Link href="/letters" className={buttonClass("ghost")}>
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </form>
  );
}
