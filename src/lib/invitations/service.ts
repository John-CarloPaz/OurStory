import "server-only";
import { getInvitationMailer } from "@/lib/email";
import { getSiteUrl } from "@/lib/site-url";
import { describeError } from "@/lib/errors";
import { generateInvitationToken } from "@/lib/invitations/token";
import { serverEnv } from "@/lib/server-env";
import type { Session } from "@/lib/tenant";

/**
 * Invitation orchestration: token generation -> database RPC (which enforces
 * membership, limits and rate limits) -> email delivery.
 *
 * The raw token is generated here, hashed before it reaches the database, and
 * only ever leaves the server inside the invitation link.
 */

type RpcInvitation = {
  invitation_id: string;
  invited_email: string;
  expires_at: string;
  inviter_name: string | null;
  couple_label: string;
};

export type InvitationOutcome = {
  invitedEmail: string;
  expiresAt: string;
  delivered: boolean;
  /** Present only when the email could not be sent, so the inviter can share it directly. */
  shareUrl: string | null;
};

export type ServiceResult<T> = { ok: true; value: T } | { ok: false; error: string; code?: string; retryAfterSeconds?: number };

export function invitationUrl(token: string): string {
  return `${getSiteUrl()}/invite/${token}`;
}

async function deliver(token: string, invitation: RpcInvitation): Promise<InvitationOutcome> {
  const acceptUrl = invitationUrl(token);
  const result = await getInvitationMailer().sendInvitation({
    to: invitation.invited_email,
    acceptUrl,
    inviterName: invitation.inviter_name ?? "Your partner",
    coupleLabel: invitation.couple_label,
    expiresAt: new Date(invitation.expires_at),
  });
  return {
    invitedEmail: invitation.invited_email,
    expiresAt: invitation.expires_at,
    delivered: result.delivered,
    shareUrl: result.delivered ? null : acceptUrl,
  };
}

function failure(error: { message?: string; code?: string; hint?: string | null }): ServiceResult<never> {
  const retry = Number.parseInt(error.hint ?? "", 10);
  return {
    ok: false,
    error: describeError(error),
    code: error.message,
    retryAfterSeconds: Number.isFinite(retry) ? retry : undefined,
  };
}

export async function createSpaceWithInvitation(
  session: Session,
  input: { creatorName: string; partnerEmail: string; coupleName: string | null; storyBeganOn: string | null },
): Promise<ServiceResult<InvitationOutcome & { coupleId: string }>> {
  const { token, tokenHash } = generateInvitationToken();

  const { data, error } = await session.supabase.rpc("create_couple", {
    p_creator_name: input.creatorName,
    p_partner_email: input.partnerEmail,
    p_invite_token_hash: tokenHash,
    p_couple_name: input.coupleName ?? undefined,
    p_story_began_on: input.storyBeganOn ?? undefined,
    p_invite_ttl_days: serverEnv.invitationTtlDays,
  });
  if (error) return failure(error);

  const created = data as RpcInvitation & { couple_id: string };
  const outcome = await deliver(token, created);
  return { ok: true, value: { ...outcome, coupleId: created.couple_id } };
}

export async function inviteToSpace(
  session: Session,
  coupleId: string,
  email: string,
): Promise<ServiceResult<InvitationOutcome>> {
  const { token, tokenHash } = generateInvitationToken();
  const { data, error } = await session.supabase.rpc("create_couple_invitation", {
    p_couple_id: coupleId,
    p_invited_email: email,
    p_token_hash: tokenHash,
    p_ttl_days: serverEnv.invitationTtlDays,
  });
  if (error) return failure(error);
  return { ok: true, value: await deliver(token, data as RpcInvitation) };
}

export async function resendInvitation(session: Session, invitationId: string): Promise<ServiceResult<InvitationOutcome>> {
  const { token, tokenHash } = generateInvitationToken();
  const { data, error } = await session.supabase.rpc("resend_couple_invitation", {
    p_invitation_id: invitationId,
    p_token_hash: tokenHash,
    p_ttl_days: serverEnv.invitationTtlDays,
  });
  if (error) return failure(error);
  return { ok: true, value: await deliver(token, data as RpcInvitation) };
}

export async function cancelInvitation(session: Session, invitationId: string): Promise<ServiceResult<null>> {
  const { error } = await session.supabase.rpc("cancel_couple_invitation", { p_invitation_id: invitationId });
  return error ? failure(error) : { ok: true, value: null };
}

// Acceptance -----------------------------------------------------------------------

export type InvitationStatus =
  | "valid"
  | "not_found"
  | "cancelled"
  | "accepted"
  | "expired"
  | "full"
  | "unavailable"
  | "already_member";

export type InvitationPreview = {
  status: InvitationStatus;
  inviter_name?: string | null;
  couple_label?: string;
  display_title?: string;
  invited_email?: string;
  expires_at?: string;
  viewer_email_matches?: boolean | null;
};

export async function getInvitationPreview(session: Pick<Session, "supabase">, token: string): Promise<InvitationPreview> {
  const { data, error } = await session.supabase.rpc("get_invitation_preview", { p_token: token });
  if (error) throw error;
  return data as InvitationPreview;
}

export async function acceptInvitation(
  session: Session,
  token: string,
  displayName?: string,
): Promise<ServiceResult<{ coupleId: string }>> {
  const { data, error } = await session.supabase.rpc("accept_couple_invitation", {
    p_token: token,
    p_display_name: displayName,
  });
  if (error) return failure(error);
  return { ok: true, value: { coupleId: (data as { couple_id: string }).couple_id } };
}

/** What the invitation page says for each status that cannot be accepted. */
export const INVITATION_STATUS_COPY: Record<Exclude<InvitationStatus, "valid" | "already_member">, { title: string; body: string }> = {
  not_found: { title: "This invitation is no longer valid.", body: "The link may have been replaced by a newer invitation or cancelled." },
  cancelled: { title: "This invitation is no longer valid.", body: "It was cancelled by the person who sent it." },
  accepted: { title: "This invitation has already been used.", body: "If it was yours, sign in to open your space." },
  expired: { title: "This invitation has expired.", body: "Ask the person who invited you to send a new one." },
  full: { title: "This space already has two members.", body: "This invitation can no longer be accepted." },
  unavailable: { title: "This invitation is no longer valid.", body: "The space it belongs to is no longer available." },
};
