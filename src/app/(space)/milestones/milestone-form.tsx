"use client";

import Link from "next/link";
import { saveMilestone } from "@/app/actions/content";
import { MILESTONE_META } from "@/components/content-meta";
import { Field, FormMessage, Input, SubmitButton, Textarea } from "@/components/ui/form";
import { IDLE } from "@/lib/forms";
import { useFormAction } from "@/components/ui/use-form-action";

type Milestone = { id: string; title: string; description: string | null; occurred_on: string; icon: string };

export function MilestoneForm({ milestone, today }: { milestone?: Milestone; today: string }) {
  const { state, pending, formProps } = useFormAction(saveMilestone, IDLE, { resetOnSuccess: !milestone });

  return (
    <form {...formProps} className="os-card space-y-5 p-6">
      <h2 className="os-display text-2xl text-ink">{milestone ? "Edit milestone" : "Add a milestone"}</h2>
      {milestone ? <input type="hidden" name="milestoneId" value={milestone.id} /> : null}
      <Field label="What happened" name="title" state={state}>
        <Input name="title" required maxLength={160} defaultValue={milestone?.title} placeholder="Our first date" state={state} />
      </Field>
      <Field label="When" name="occurredOn" state={state}>
        <Input name="occurredOn" type="date" required defaultValue={milestone?.occurred_on ?? today} state={state} />
      </Field>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink">Icon</legend>
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(MILESTONE_META).map(([value, { label, icon: Icon }]) => (
            <label key={value} className="cursor-pointer" title={label}>
              <input type="radio" name="icon" value={value} defaultChecked={(milestone?.icon ?? "heart") === value} className="peer sr-only" />
              <span className="grid h-11 place-items-center rounded-xl border border-line text-muted transition peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:text-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                <Icon className="size-4" aria-label={label} />
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="The story behind it" name="description" state={state} optional>
        <Textarea name="description" rows={3} maxLength={5000} defaultValue={milestone?.description ?? ""} state={state} />
      </Field>
      <FormMessage state={state} />
      <div className="flex items-center gap-3">
        <SubmitButton pending={pending} pendingText="Saving…">{milestone ? "Save" : "Add milestone"}</SubmitButton>
        {milestone ? (
          <Link href="/milestones" className="text-sm text-muted hover:text-ink">
            Cancel
          </Link>
        ) : null}
      </div>
    </form>
  );
}
