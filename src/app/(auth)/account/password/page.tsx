"use client";

import { updatePassword } from "@/app/actions/auth";
import { Field, FormMessage, Input, SubmitButton } from "@/components/ui/form";
import { IDLE } from "@/lib/forms";
import { useFormAction } from "@/components/ui/use-form-action";
import { AuthCard } from "@/components/decor/scene";

export default function NewPasswordPage() {
  const { state, pending, formProps } = useFormAction(updatePassword, IDLE);

  return (
    <AuthCard title="Choose a new password" note="a fresh start">
      <form {...formProps} className="mt-8 space-y-5">
        <Field label="New password" name="password" state={state} hint="At least 8 characters.">
          <Input name="password" type="password" required minLength={8} autoComplete="new-password" state={state} />
        </Field>
        <FormMessage state={state} />
        <SubmitButton pending={pending} size="lg" className="w-full" pendingText="Saving…">
          Save password
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
