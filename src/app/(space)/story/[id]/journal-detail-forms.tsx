"use client";

import { Lock, Users } from "lucide-react";
import { useState } from "react";
import { addReflection, updatePhotoCaption } from "@/app/actions/journals";
import { FormMessage, SubmitButton, Textarea } from "@/components/ui/form";
import { useFormAction } from "@/components/ui/use-form-action";
import { IDLE } from "@/lib/forms";

export function ReflectionForm({ journalId, partnerName }: { journalId: string; partnerName: string | null }) {
  const { state, pending, formProps } = useFormAction(addReflection, IDLE, { resetOnSuccess: true });

  return (
    <form {...formProps} className="os-card space-y-4 p-5 sm:p-6">
      <input type="hidden" name="journalId" value={journalId} />
      <label htmlFor="body" className="os-hand block text-3xl text-ink">
        Add your reflection ✎
      </label>
      <Textarea name="body" required maxLength={20000} rows={4} placeholder="How did this day feel to you?" className="os-hand !text-xl leading-snug" state={state} />
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Who can see this</legend>
        <label className="cursor-pointer">
          <input type="radio" name="visibility" value="shared" defaultChecked className="peer sr-only" />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm text-muted transition peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:text-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
            <Users className="size-3.5" aria-hidden /> {partnerName ? `Shared with ${partnerName}` : "Shared"}
          </span>
        </label>
        <label className="cursor-pointer">
          <input type="radio" name="visibility" value="private" className="peer sr-only" />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm text-muted transition peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:text-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
            <Lock className="size-3.5" aria-hidden /> Private, just for me
          </span>
        </label>
      </fieldset>
      <FormMessage state={state} />
      <SubmitButton size="sm" pending={pending} pendingText="Saving…">
        Save reflection
      </SubmitButton>
    </form>
  );
}

export function CaptionForm({ photoId, caption }: { photoId: string; caption: string | null }) {
  const [editing, setEditing] = useState(false);
  const { state, pending, formProps } = useFormAction(updatePhotoCaption, IDLE, { onSuccess: () => setEditing(false) });

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="os-hand min-w-0 truncate text-left text-lg leading-tight text-[#4a3b33] hover:text-black">
        {caption || <span className="opacity-60">add a caption…</span>}
      </button>
    );
  }

  return (
    <form {...formProps} className="min-w-0 flex-1">
      <div className="flex gap-1.5">
        <input type="hidden" name="photoId" value={photoId} />
        <input
          name="caption"
          defaultValue={caption ?? ""}
          maxLength={500}
          autoFocus
          aria-label="Caption"
          className="h-8 min-w-0 flex-1 rounded-lg border border-[#e0d6c8] bg-white px-2 text-sm text-[#3b2f2a] focus:border-accent focus:outline-none"
        />
        <SubmitButton size="sm" pending={pending} className="!h-8 !px-3">
          Save
        </SubmitButton>
      </div>
      {state.status === "error" ? <p className="mt-1 text-xs text-danger">{state.message}</p> : null}
    </form>
  );
}
