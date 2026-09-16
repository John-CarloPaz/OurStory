"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearInvitationCookies, setActiveCoupleCookie } from "@/lib/cookies";
import { getInvitationMailer } from "@/lib/email";
import { describeCode, describeError } from "@/lib/errors";
import { formError, parseForm, type FormState } from "@/lib/forms";
import {
  acceptInvitation,
  cancelInvitation,
  getInvitationPreview,
  invitationUrl,
  inviteToSpace,
  resendInvitation,
  type InvitationOutcome,
} from "@/lib/invitations/service";
import { getSiteUrl } from "@/lib/site-url";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireActiveSpace, requireSession } from "@/lib/tenant";
import { invitationTokenSchema, invitedAccountSetupSchema, invitedSignUpSchema, invitePartnerSchema, uuid } from "@/lib/validation";

export type InvitationFormState = FormState & {
  code?: "account_exists" | "check_email";
  outcome?: InvitationOutcome;
};

async function joinAndGoHome(coupleId: string): Promise<never> {
  await setActiveCoupleCookie(coupleId);
  await clearInvitationCookies();
  revalidatePath("/", "layout");
  redirect("/home");
}

/** Existing, signed-in account: "Join Space". */
export async function acceptInvitationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = invitationTokenSchema.safeParse(formData.get("token"));
  if (!token.success) return formError(describeCode("invitation_not_found"));

  const session = await requireSession(`/invite/${token.data}`);
  const result = await acceptInvitation(session, token.data);
  if (!result.ok) return formError(result.error);

  return joinAndGoHome(result.value.coupleId);
}

/**
 * Not signed in: "Create your account". The email address always comes from
 * the invitation itself, never from the form.
 */
export async function signUpForInvitation(_prev: InvitationFormState, formData: FormData): Promise<InvitationFormState> {
  const parsed = parseForm(invitedSignUpSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { token, displayName, password } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const preview = await getInvitationPreview({ supabase }, token);
  if (preview.status !== "valid" || !preview.invited_email) {
    return formError(describeCode(preview.status === "expired" ? "invitation_expired" : "invitation_not_found"));
  }
  const email = preview.invited_email;

  const { data: accountState, error: stateError } = await createSupabaseAdminClient().rpc("get_auth_account_state", {
    p_email: email,
  });
  if (stateError) return formError(describeError(stateError));

  if (accountState === "confirmed") {
    return { status: "error", code: "account_exists", message: "You already have an account with this email. Sign in to join." };
  }

  if (accountState === "unconfirmed") {
    // The address has an account that was never verified (for example one
    // created by the invitation email). A password can only be set after the
    // owner proves the address is theirs, so send a fresh verification link.
    const delivery = await getInvitationMailer().sendInvitation({
      to: email,
      acceptUrl: invitationUrl(token),
      inviterName: preview.inviter_name ?? "Your partner",
      coupleLabel: preview.couple_label ?? "Our Story",
      expiresAt: new Date(preview.expires_at ?? Date.now()),
    });
    if (!delivery.delivered) {
      return formError("We couldn't send your verification email just now. Please try again in a few minutes.");
    }
    return {
      status: "success",
      code: "check_email",
      message: `We've sent a secure link to ${email}. Open it to verify your email, then choose your password.`,
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: `${getSiteUrl()}/invite/${token}`,
    },
  });
  if (error) return formError(describeError(error));
  if (data.user && data.user.identities?.length === 0) {
    return { status: "error", code: "account_exists", message: "You already have an account with this email. Sign in to join." };
  }

  if (data.session) {
    const session = await requireSession(`/invite/${token}`);
    const result = await acceptInvitation(session, token, displayName);
    if (!result.ok) return formError(result.error);
    return joinAndGoHome(result.value.coupleId);
  }

  return {
    status: "success",
    code: "check_email",
    message: `Check ${email} for a link to verify your email. It brings you straight back here to join.`,
  };
}

/** Signed in through the invitation email, no password yet: finish the account and join. */
export async function completeInvitedAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(invitedAccountSetupSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { token, displayName, password } = parsed.data;

  const session = await requireSession(`/invite/${token}`);
  const preview = await getInvitationPreview(session, token);
  if (preview.status !== "valid") return formError(describeCode("invitation_not_found"));
  if (preview.viewer_email_matches === false) return formError(describeCode("invitation_email_mismatch"));

  const { error } = await session.supabase.auth.updateUser({
    password,
    data: { display_name: displayName, needs_password: false },
  });
  if (error) return formError(describeError(error));
  await session.supabase.auth.refreshSession();

  const result = await acceptInvitation(session, token, displayName);
  if (!result.ok) return formError(result.error);
  return joinAndGoHome(result.value.coupleId);
}

/** Forget an invitation link that turned out to be unusable. */
export async function clearPendingInvitation(): Promise<void> {
  await clearInvitationCookies();
}

// Managing invitations from settings --------------------------------------------------

export async function invitePartner(_prev: InvitationFormState, formData: FormData): Promise<InvitationFormState> {
  const parsed = parseForm(invitePartnerSchema, formData);
  if (!parsed.ok) return parsed.state;

  const space = await requireActiveSpace();
  const result = await inviteToSpace(space, space.coupleId, parsed.data.email);
  if (!result.ok) return formError(result.error);

  revalidatePath("/settings");
  return {
    status: "success",
    outcome: result.value,
    message: result.value.delivered ? `Invitation sent to ${result.value.invitedEmail}.` : undefined,
  };
}

export async function resendInvitationAction(_prev: InvitationFormState, formData: FormData): Promise<InvitationFormState> {
  const invitationId = uuid.safeParse(formData.get("invitationId"));
  if (!invitationId.success) return formError(describeCode("invitation_not_found"));

  // Membership of the invitation's couple is verified inside the RPC.
  const space = await requireActiveSpace();
  const result = await resendInvitation(space, invitationId.data);
  if (!result.ok) {
    const wait = result.retryAfterSeconds;
    return formError(
      result.code === "resend_too_soon" && wait ? `The invitation was just sent. You can resend it in ${wait} seconds.` : result.error,
    );
  }

  revalidatePath("/settings");
  return {
    status: "success",
    outcome: result.value,
    message: result.value.delivered ? `We sent a fresh invitation to ${result.value.invitedEmail}. The previous link no longer works.` : undefined,
  };
}

export async function cancelInvitationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const invitationId = uuid.safeParse(formData.get("invitationId"));
  if (!invitationId.success) return formError(describeCode("invitation_not_found"));

  const space = await requireActiveSpace();
  const result = await cancelInvitation(space, invitationId.data);
  if (!result.ok) return formError(result.error);

  revalidatePath("/settings");
  revalidatePath("/home");
  return { status: "success", message: "Invitation cancelled. The link no longer works." };
}
