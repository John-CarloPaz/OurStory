"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/auth";
import { Field, FormMessage, Input, SubmitButton } from "@/components/ui/form";
import { IDLE } from "@/lib/forms";
import { useFormAction } from "@/components/ui/use-form-action";
import { AuthCard } from "@/components/decor/scene";

export default function ForgotPasswordPage() {
  const { state, pending, formProps } = useFormAction(requestPasswordReset, IDLE);

  return (
    <AuthCard title="Reset your password" note="it happens ♡" description="We'll email you a link to choose a new one.">
      <form {...formProps} className="mt-8 space-y-5">
        <Field label="Email" name="email" state={state}>
          <Input name="email" type="email" autoComplete="email" required state={state} />
        </Field>
        <FormMessage state={state} />
        <SubmitButton pending={pending} size="lg" className="w-full" pendingText="Sending…">
          Send reset link
        </SubmitButton>
      </form>
      <p className="mt-7 border-t border-dashed border-line pt-5 text-center text-sm">
        <Link
          href="/login"
          className="group inline-flex min-h-10 items-center gap-1.5 text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          <ArrowLeft className="size-4 transition group-hover:-translate-x-0.5" aria-hidden /> Back to sign in
        </Link>
      </p>
    </AuthCard>
  );
}
