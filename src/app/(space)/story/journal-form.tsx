"use client";

import Link from "next/link";
import { createJournal, updateJournal } from "@/app/actions/journals";
import { PlaceIcon } from "@/components/content-meta";
import { buttonClass } from "@/components/ui/button";
import { Field, FormMessage, Input, SubmitButton, Textarea } from "@/components/ui/form";
import { IDLE } from "@/lib/forms";
import { useFormAction } from "@/components/ui/use-form-action";

type Journal = { id: string; title: string; entry_date: string; mood: string | null; body: string | null };
type Place = { id: string; name: string; category: string };

export function JournalForm({
  journal,
  places,
  linkedPlaceIds = [],
  today,
}: {
  journal?: Journal;
  places: Place[];
  linkedPlaceIds?: string[];
  today: string;
}) {
  const { state, pending, formProps } = useFormAction(journal ? updateJournal : createJournal, IDLE);

  return (
    <form {...formProps} className="os-card space-y-6 p-6 sm:p-8">
      {journal ? <input type="hidden" name="journalId" value={journal.id} /> : null}

      <Field label="Title" name="title" state={state}>
        <Input
          name="title"
          required
          maxLength={160}
          defaultValue={journal?.title}
          placeholder="The night we got lost in Lisbon"
          className="os-display !h-14 !text-2xl"
          state={state}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Date" name="entryDate" state={state}>
          <Input name="entryDate" type="date" required defaultValue={journal?.entry_date ?? today} state={state} />
        </Field>
        <Field label="Mood" name="mood" state={state} optional>
          <Input name="mood" maxLength={40} defaultValue={journal?.mood ?? ""} placeholder="Giddy, cozy, adventurous…" state={state} />
        </Field>
      </div>

      <Field label="What happened" name="body" state={state} optional>
        <Textarea
          name="body"
          rows={12}
          maxLength={50000}
          defaultValue={journal?.body ?? ""}
          placeholder="Write it the way you'd tell it to each other."
          className="os-prose !text-lg"
          state={state}
        />
      </Field>

      {places.length ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-ink">Places</legend>
          <div className="flex flex-wrap gap-2">
            {places.map((p) => (
              <label key={p.id} className="cursor-pointer">
                <input type="checkbox" name="placeIds[]" value={p.id} defaultChecked={linkedPlaceIds.includes(p.id)} className="peer sr-only" />
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm text-muted transition peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:text-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                  <PlaceIcon category={p.category} className="size-3.5" /> {p.name}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <FormMessage state={state} />
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pending={pending} pendingText="Saving…">{journal ? "Save changes" : "Save entry"}</SubmitButton>
        <Link href={journal ? `/story/${journal.id}` : "/story"} className={buttonClass("ghost")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
