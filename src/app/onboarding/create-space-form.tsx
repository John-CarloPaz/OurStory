"use client";

import { Heart } from "lucide-react";
import { createSpace } from "@/app/actions/spaces";
import { LinkButton } from "@/components/ui/button";
import { Field, FormMessage, Input, SubmitButton } from "@/components/ui/form";
import { InvitationDeliveryNotice } from "@/components/invitation-delivery-notice";
import { useFormAction } from "@/components/ui/use-form-action";
import type { InvitationFormState } from "@/app/actions/invitations";

const IDLE: InvitationFormState = { status: "idle" };

export function CreateSpaceForm({ defaultName }: { defaultName: string }) {
  const { state, pending, formProps } = useFormAction(createSpace, IDLE);

  if (state.status === "success" && state.outcome) {
    const { outcome } = state;
    return (
      <div className="os-card p-8 text-center sm:p-10">
        <div className="mx-auto mb-5 grid size-14 place-items-center rounded-full bg-accent-soft text-accent">
          <Heart className="size-6" aria-hidden />
        </div>
        <h1 className="os-display text-3xl text-ink">Your space is ready.</h1>
        <InvitationDeliveryNotice outcome={outcome} />
        <LinkButton href="/home" size="lg" className="mt-8">
          Go To Our Story
        </LinkButton>
      </div>
    );
  }

  return (
    <div className="os-card p-8 sm:p-10">
      <h1 className="os-display text-3xl text-ink">Create Your Space</h1>
      <p className="mt-2 text-[0.9375rem] text-muted">A private place for the two of you. You can change all of this later.</p>

      <form {...formProps} className="mt-8 space-y-5">
        <Field label="Your name" name="creatorName" state={state}>
          <Input name="creatorName" defaultValue={defaultName} required maxLength={60} autoComplete="given-name" state={state} />
        </Field>
        <Field label="Your partner's email" name="partnerEmail" state={state} hint="We'll send them a private invitation.">
          <Input name="partnerEmail" type="email" required autoComplete="off" placeholder="partner@example.com" state={state} />
        </Field>
        <Field label="Relationship name" name="coupleName" state={state} optional>
          <Input name="coupleName" maxLength={80} placeholder="Leave blank to use both your names" state={state} />
        </Field>
        <Field label="When did your story begin?" name="storyBeganOn" state={state} optional>
          <Input name="storyBeganOn" type="date" state={state} />
        </Field>
        <FormMessage state={state} />
        <SubmitButton pending={pending} className="w-full" size="lg" pendingText="Creating your space…">
          Create Our Space
        </SubmitButton>
      </form>
    </div>
  );
}
