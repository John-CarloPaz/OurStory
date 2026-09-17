"use client";

import Link from "next/link";
import { signIn } from "@/app/actions/auth";
import { Field, FormMessage, Input, SubmitButton } from "@/components/ui/form";
import { IDLE } from "@/lib/forms";
import { useFormAction } from "@/components/ui/use-form-action";

export function LoginForm({ next, email }: { next?: string; email?: string }) {
  const { state, pending, formProps } = useFormAction(signIn, IDLE);

  return (
    <form {...formProps} className="mt-8 space-y-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field label="Email" name="email" state={state}>
        <Input name="email" type="email" autoComplete="email" required defaultValue={email} state={state} />
      </Field>
      <Field label="Password" name="password" state={state}>
        <Input name="password" type="password" autoComplete="current-password" required state={state} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pending={pending} size="lg" className="w-full" pendingText="Signing in…">
        Sign in
      </SubmitButton>
      <p className="-mt-1 text-center text-sm">
        <Link href="/forgot-password" className="inline-flex min-h-10 items-center text-muted underline-offset-4 hover:text-ink hover:underline">
          Forgot your password?
        </Link>
      </p>
    </form>
  );
}
