"use server";

import { redirect } from "next/navigation";
import { getPendingInviteToken } from "@/lib/cookies";
import { publicEnv } from "@/lib/env";
import { describeError } from "@/lib/errors";
import { formError, formSuccess, parseForm, type FormState } from "@/lib/forms";
import { safeRedirectPath } from "@/lib/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/tenant";
import {
  accountSetupSchema,
  forgotPasswordSchema,
  newPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation";

async function destinationAfterAuth(next: string | undefined): Promise<string> {
  const explicit = safeRedirectPath(next, "");
  if (explicit && explicit !== "/") return explicit;
  const pendingInvite = await getPendingInviteToken();
  return pendingInvite ? `/invite/${pendingInvite}` : "/home";
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(signInSchema, formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return formError(describeError(error, "That email and password don't match."));

  redirect(await destinationAfterAuth(parsed.data.next));
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(signUpSchema, formData);
  if (!parsed.ok) return parsed.state;

  const destination = await destinationAfterAuth(parsed.data.next);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      // A plain page URL: the email appends ?token_hash=&type=, and the proxy verifies it.
      emailRedirectTo: `${publicEnv.siteUrl}${new URL(destination === "/home" ? "/onboarding" : destination, publicEnv.siteUrl).pathname}`,
    },
  });
  if (error) return formError(describeError(error));

  // Supabase hides whether an address is registered; an empty identities list means it is.
  if (data.user && data.user.identities?.length === 0) {
    return formError("An account with this email already exists. Try signing in instead.");
  }

  if (data.session) redirect(destination === "/home" ? "/onboarding" : destination);
  redirect("/check-email");
}

export async function signOut(formData?: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  const next = safeRedirectPath(formData?.get("next")?.toString(), "");
  redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(forgotPasswordSchema, formData);
  if (!parsed.ok) return parsed.state;

  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${publicEnv.siteUrl}/account/password`,
  });
  // Same answer whether or not the account exists.
  return formSuccess("If an account exists for that email, a reset link is on its way.");
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(newPasswordSchema, formData);
  if (!parsed.ok) return parsed.state;

  const session = await requireSession("/account/password");
  const { error } = await session.supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return formError(describeError(error));

  redirect(safeRedirectPath(parsed.data.next, "/home"));
}

/** For accounts created by an invitation email that have no password yet. */
export async function completeAccountSetup(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(accountSetupSchema, formData);
  if (!parsed.ok) return parsed.state;

  const session = await requireSession("/account/setup");
  const { error } = await session.supabase.auth.updateUser({
    password: parsed.data.password,
    data: { display_name: parsed.data.displayName, needs_password: false },
  });
  if (error) return formError(describeError(error));

  // Re-issue the JWT so the updated metadata is reflected immediately.
  await session.supabase.auth.refreshSession();
  redirect(await destinationAfterAuth(parsed.data.next));
}
