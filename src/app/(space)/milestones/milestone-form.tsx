"use client";

import Link from "next/link";
import { saveMilestone } from "@/app/actions/content";
import { MILESTONE_META } from "@/components/content-meta";
import { Doodle, Tape } from "@/components/decor/materials";
import { Field, FormMessage, Input, SubmitButton, Textarea } from "@/components/ui/form";
import { IDLE } from "@/lib/forms";
import { useFormAction } from "@/components/ui/use-form-action";

type Milestone = { id: string; title: string; description: string | null; occurred_on: string; icon: string };

export function MilestoneForm({ milestone, today }: { milestone?: Milestone; today: string }) {
  const { state, pending, formProps } = useFormAction(saveMilestone, IDLE, { resetOnSuccess: !milestone });

  return (
    <div className="relative">
      <Tape className="absolute -top-3 left-1/2 z-10 w-24 -translate-x-1/2" rotate={-4} color="#ffcf99" pattern="grid" />
      <form {...formProps} className="os-card relative space-y-5 p-6">
        <Doodle kind="sparkle" className="pointer-events-none absolute top-5 right-5 size-6 text-accent/40" />
        <div>
          <h2 className="os-display text-2xl text-ink">{milestone ? "Edit milestone" : "Add a milestone"}</h2>
          <p aria-hidden className="os-hand -mt-0.5 -rotate-1 text-xl text-accent">{milestone ? "fix the details" : "another one for the book"}</p>
        </div>
        {milestone ? <input type="hidden" name="milestoneId" value={milestone.id} /> : null}
        <Field label="What happened" name="title" state={state}>
          <Input name="title" required maxLength={160} defaultValue={milestone?.title} placeholder="Our first date" state={state} />
        </Field>
        <Field label="When" name="occurredOn" state={state}>
          <Input name="occurredOn" type="date" required defaultValue={milestone?.occurred_on ?? today} state={state} />
        </Field>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">Icon</legend>
          <div className="grid grid-cols-4 gap-2.5">
            {Object.entries(MILESTONE_META).map(([value, { label, icon: Icon }]) => (
              <label key={value} className="cursor-pointer" title={label}>
                <input type="radio" name="icon" value={value} defaultChecked={(milestone?.icon ?? "heart") === value} className="peer sr-only" />
                <span className="grid h-12 place-items-center rounded-2xl border border-[var(--os-glass-border)] bg-[color-mix(in_srgb,var(--os-field)_65%,transparent)] text-muted transition duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:border-accent/50 hover:text-ink peer-checked:-rotate-6 peer-checked:border-transparent peer-checked:bg-[linear-gradient(135deg,var(--os-primary),color-mix(in_srgb,var(--os-primary)_68%,#ff9f7a))] peer-checked:text-on-accent peer-checked:shadow-[0_10px_20px_-10px_color-mix(in_srgb,var(--os-primary)_85%,transparent)] peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--os-bg)]">
                  <Icon className="size-[1.15rem]" aria-label={label} />
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="The story behind it" name="description" state={state} optional>
          <Textarea name="description" rows={3} maxLength={5000} defaultValue={milestone?.description ?? ""} state={state} />
        </Field>
        <FormMessage state={state} />
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton pending={pending} pendingText="Saving…">
            {milestone ? "Save" : "Add milestone"}
          </SubmitButton>
          {milestone ? (
            <Link href="/milestones" className="inline-flex h-10 items-center rounded-full px-3 text-sm text-muted hover:text-ink">
              Cancel
            </Link>
          ) : null}
        </div>
      </form>
    </div>
  );
}
