"use client";

import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/auth";
import { Field, FormMessage, Input, SubmitButton } from "@/components/ui/form";
import { IDLE } from "@/lib/forms";
import { useFormAction } from "@/components/ui/use-form-action";

export default function ForgotPasswordPage() {
  const { state, pending, formProps } = useFormAction(requestPasswordReset, IDLE);

  return (
    <div className="os-card p-8 sm:p-10">
      <h1 className="os-display text-3xl text-ink">Reset your password</h1>
      <p className="mt-2 text-[0.9375rem] text-muted">We&apos;ll email you a link to choose a new one.</p>
      <form {...formProps} className="mt-8 space-y-5">
        <Field label="Email" name="email" state={state}>
          <Input name="email" type="email" autoComplete="email" required state={state} />
        </Field>
        <FormMessage state={state} />
        <SubmitButton pending={pending} className="w-full" pendingText="Sending…">
          Send reset link
        </SubmitButton>
      </form>
      <p className="mt-8 text-center text-sm">
        <Link href="/login" className="text-muted hover:text-ink hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
