"use client";

import Link from "next/link";
import { saveLetter } from "@/app/actions/content";
import { buttonClass } from "@/components/ui/button";
import { Field, FormMessage, Input, SubmitButton, Textarea } from "@/components/ui/form";
import { IDLE } from "@/lib/forms";
import { useFormAction } from "@/components/ui/use-form-action";

type Letter = { id: string; title: string; content: string; unlockDate: string; unlockTime: string };

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
    <form {...formProps} className="os-card space-y-6 p-6 sm:p-8">
      {letter ? <input type="hidden" name="letterId" value={letter.id} /> : null}
      <Field
        label="On the envelope"
        name="title"
        state={state}
        hint={`${recipientName} can see this before the letter opens.`}
      >
        <Input name="title" required maxLength={160} defaultValue={letter?.title} placeholder="Open when you miss me" state={state} />
      </Field>
      <Field label={`Dear ${recipientName},`} name="content" state={state} hint="Sealed until the day you choose.">
        <Textarea name="content" required rows={14} maxLength={50000} defaultValue={letter?.content} className="os-prose !text-lg" state={state} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Opens on" name="unlockDate" state={state}>
          <Input name="unlockDate" type="date" required defaultValue={letter?.unlockDate ?? defaultUnlockDate} state={state} />
        </Field>
        <Field label="At" name="unlockTime" state={state}>
          <Input name="unlockTime" type="time" required defaultValue={letter?.unlockTime ?? "09:00"} state={state} />
        </Field>
      </div>
      <FormMessage state={state} />
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pending={pending} pendingText="Sealing…">{letter ? "Save letter" : "Seal letter"}</SubmitButton>
        <Link href="/letters" className={buttonClass("ghost")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
