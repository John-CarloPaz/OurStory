"use client";

import { completeAccountSetup } from "@/app/actions/auth";
import { Field, FormMessage, Input, SubmitButton } from "@/components/ui/form";
import { IDLE } from "@/lib/forms";
import { useFormAction } from "@/components/ui/use-form-action";

export function AccountSetupForm({ email, defaultName, next }: { email: string; defaultName: string; next: string }) {
  const { state, pending, formProps } = useFormAction(completeAccountSetup, IDLE);

  return (
    <form {...formProps} className="mt-8 space-y-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field label="Email" name="email-display">
        <Input name="email-display" value={email} readOnly disabled />
      </Field>
      <Field label="Your name" name="displayName" state={state}>
        <Input name="displayName" defaultValue={defaultName} required maxLength={60} autoComplete="given-name" state={state} />
      </Field>
      <Field label="Password" name="password" state={state} hint="At least 8 characters.">
        <Input name="password" type="password" required minLength={8} autoComplete="new-password" state={state} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pending={pending} size="lg" className="w-full" pendingText="Saving…">
        Continue
      </SubmitButton>
    </form>
  );
}
