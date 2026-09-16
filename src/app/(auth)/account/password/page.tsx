"use client";

import { updatePassword } from "@/app/actions/auth";
import { Field, FormMessage, Input, SubmitButton } from "@/components/ui/form";
import { IDLE } from "@/lib/forms";
import { useFormAction } from "@/components/ui/use-form-action";

export default function NewPasswordPage() {
  const { state, pending, formProps } = useFormAction(updatePassword, IDLE);

  return (
    <div className="os-card p-8 sm:p-10">
      <h1 className="os-display text-3xl text-ink">Choose a new password</h1>
      <form {...formProps} className="mt-8 space-y-5">
        <Field label="New password" name="password" state={state} hint="At least 8 characters.">
          <Input name="password" type="password" required minLength={8} autoComplete="new-password" state={state} />
        </Field>
        <FormMessage state={state} />
        <SubmitButton pending={pending} className="w-full" pendingText="Saving…">
          Save password
        </SubmitButton>
      </form>
    </div>
  );
}
