"use client";

import Link from "next/link";
import { saveNote } from "@/app/actions/content";
import { Field, FormMessage, Input, SubmitButton, Textarea } from "@/components/ui/form";
import { IDLE } from "@/lib/forms";
import { useFormAction } from "@/components/ui/use-form-action";

type Note = { id: string; title: string | null; body: string; visibility: string; pinned: boolean };

export function NoteForm({ note, partnerName }: { note?: Note; partnerName: string | null }) {
  const { state, pending, formProps } = useFormAction(saveNote, IDLE, { resetOnSuccess: !note });

  return (
    <form {...formProps} className="os-card space-y-5 p-6">
      <h2 className="os-display text-2xl text-ink">{note ? "Edit note" : "New note"}</h2>
      {note ? <input type="hidden" name="noteId" value={note.id} /> : null}
      <Field label="Title" name="title" state={state} optional>
        <Input name="title" maxLength={160} defaultValue={note?.title ?? ""} state={state} />
      </Field>
      <Field label="Note" name="body" state={state}>
        <Textarea name="body" required rows={5} maxLength={20000} defaultValue={note?.body} state={state} />
      </Field>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-ink">Who can see it</legend>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="radio" name="visibility" value="private" defaultChecked={(note?.visibility ?? "private") === "private"} className="accent-[var(--os-primary)]" />
          Only me
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="radio" name="visibility" value="shared" defaultChecked={note?.visibility === "shared"} className="accent-[var(--os-primary)]" />
          {partnerName ? `Me and ${partnerName}` : "Both of us"}
        </label>
      </fieldset>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="pinned" defaultChecked={note?.pinned} className="size-4 accent-[var(--os-primary)]" />
        Pin to the top
      </label>
      <FormMessage state={state} />
      <div className="flex items-center gap-3">
        <SubmitButton pending={pending} pendingText="Saving…">{note ? "Save" : "Add note"}</SubmitButton>
        {note ? (
          <Link href="/notes" className="text-sm text-muted hover:text-ink">
            Cancel
          </Link>
        ) : null}
      </div>
    </form>
  );
}
