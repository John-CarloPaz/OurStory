"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  acceptInvitationAction,
  clearPendingInvitation,
  completeInvitedAccount,
  signUpForInvitation,
  type InvitationFormState,
} from "@/app/actions/invitations";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, FormMessage, Input, SubmitButton } from "@/components/ui/form";
import { useFormAction } from "@/components/ui/use-form-action";
import { IDLE } from "@/lib/forms";

export function InviteChoice({ token, email, inviter }: { token: string; email: string; inviter: string }) {
  const [creating, setCreating] = useState(false);
  const loginHref = `/login?next=${encodeURIComponent(`/invite/${token}`)}`;

  if (!creating) {
    return (
      <div className="mt-8 flex flex-col gap-3">
        <Button size="lg" onClick={() => setCreating(true)}>
          Create Account
        </Button>
        <Link href={loginHref} className={buttonClass("secondary", "lg")}>
          I already have an account
        </Link>
      </div>
    );
  }

  return <InvitedSignUpForm token={token} email={email} inviter={inviter} loginHref={loginHref} />;
}

const INVITE_IDLE: InvitationFormState = { status: "idle" };

function InvitedSignUpForm({ token, email, inviter, loginHref }: { token: string; email: string; inviter: string; loginHref: string }) {
  const { state, pending, formProps } = useFormAction(signUpForInvitation, INVITE_IDLE);

  if (state.code === "check_email") {
    return (
      <div className="mt-8 rounded-2xl bg-accent-soft p-5">
        <MailCheck className="mb-3 size-5 text-accent" aria-hidden />
        <p className="text-[0.9375rem] leading-relaxed text-ink">{state.message}</p>
        <p className="mt-2 text-sm text-muted">Your invitation from {inviter} will be waiting.</p>
      </div>
    );
  }

  return (
    <form {...formProps} className="mt-8 space-y-5">
      <h2 className="os-display text-2xl text-ink">Create your account</h2>
      <input type="hidden" name="token" value={token} />
      <Field label="Name" name="displayName" state={state}>
        <Input name="displayName" required maxLength={60} autoComplete="given-name" state={state} />
      </Field>
      <Field label="Email" name="email-display" hint="Invitations are tied to the address they were sent to.">
        <Input name="email-display" value={email} readOnly disabled />
      </Field>
      <Field label="Password" name="password" state={state} hint="At least 8 characters.">
        <Input name="password" type="password" required minLength={8} autoComplete="new-password" state={state} />
      </Field>
      <FormMessage state={state} />
      {state.code === "account_exists" ? (
        <Link href={loginHref} className={buttonClass("primary", "lg", "w-full")}>
          Sign in to join
        </Link>
      ) : (
        <SubmitButton pending={pending} size="lg" className="w-full" pendingText="Creating your account…">
          Create Account
        </SubmitButton>
      )}
    </form>
  );
}

export function CompleteInvitedAccountForm({ token, email, defaultName }: { token: string; email: string; defaultName: string }) {
  const { state, pending, formProps } = useFormAction(completeInvitedAccount, IDLE);

  return (
    <form {...formProps} className="mt-8 space-y-5">
      <input type="hidden" name="token" value={token} />
      <Field label="Name" name="displayName" state={state}>
        <Input name="displayName" defaultValue={defaultName} required maxLength={60} autoComplete="given-name" state={state} />
      </Field>
      <Field label="Email" name="email-display">
        <Input name="email-display" value={email} readOnly disabled />
      </Field>
      <Field label="Password" name="password" state={state} hint="At least 8 characters.">
        <Input name="password" type="password" required minLength={8} autoComplete="new-password" state={state} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pending={pending} size="lg" className="w-full" pendingText="Joining…">
        Create Account
      </SubmitButton>
    </form>
  );
}

export function JoinSpaceForm({ token, autoSubmit }: { token: string; autoSubmit: boolean }) {
  const { state, pending, formProps } = useFormAction(acceptInvitationAction, IDLE);
  const { ref } = formProps;
  const started = useRef(false);

  useEffect(() => {
    // Only set right after Supabase verified this visitor's email (see /auth/confirm).
    if (autoSubmit && !started.current) {
      started.current = true;
      ref.current?.requestSubmit();
    }
  }, [autoSubmit, ref]);

  return (
    <form {...formProps} className="mt-8 space-y-4">
      <input type="hidden" name="token" value={token} />
      <FormMessage state={state} />
      <SubmitButton pending={pending} size="lg" className="w-full" pendingText="Joining…">
        Join Space
      </SubmitButton>
    </form>
  );
}

export function ClearPendingInvitation() {
  useEffect(() => {
    void clearPendingInvitation();
  }, []);
  return null;
}
