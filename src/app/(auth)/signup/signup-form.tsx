"use client";

import { signUp } from "@/app/actions/auth";
import { Field, FormMessage, Input, SubmitButton } from "@/components/ui/form";
import { IDLE } from "@/lib/forms";
import { useFormAction } from "@/components/ui/use-form-action";

export function SignUpForm({ next }: { next?: string }) {
  const { state, pending, formProps } = useFormAction(signUp, IDLE);

  return (
    <form {...formProps} className="mt-8 space-y-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field label="Your name" name="displayName" state={state}>
        <Input name="displayName" autoComplete="given-name" required maxLength={60} state={state} />
      </Field>
      <Field label="Email" name="email" state={state}>
        <Input name="email" type="email" autoComplete="email" required state={state} />
      </Field>
      <Field label="Password" name="password" state={state} hint="At least 8 characters.">
        <Input name="password" type="password" autoComplete="new-password" required minLength={8} state={state} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pending={pending} className="w-full" pendingText="Creating your account…">
        Create account
      </SubmitButton>
    </form>
  );
}
