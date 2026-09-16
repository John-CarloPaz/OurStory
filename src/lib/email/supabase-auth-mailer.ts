import "server-only";
import { createSupabaseAdminClient, createSupabaseStatelessClient } from "@/lib/supabase/admin";
import type { DeliveryResult, InvitationEmail, InvitationMailer } from "./types";

/**
 * Delivers invitations with Supabase Auth's built-in emails — no third-party
 * email provider required.
 *
 *   New or unverified address -> auth.admin.inviteUserByEmail()  ("Invite user" template)
 *   Existing verified account -> auth.signInWithOtp()            ("Magic link" template)
 *
 * Both emails link through Supabase Auth and land on /invite/<token> signed in,
 * which also proves the recipient owns the invited address. The inviter's name
 * and couple label are passed as template data for the invite template.
 *
 * Supabase's default SMTP only delivers to your project's team members and is
 * heavily rate limited; configure custom SMTP in the Supabase dashboard for
 * real use (see README). When delivery fails, the caller shows the inviter a
 * private link they can share themselves.
 */
export class SupabaseAuthInvitationMailer implements InvitationMailer {
  readonly channel = "supabase-auth";

  async sendInvitation(email: InvitationEmail): Promise<DeliveryResult> {
    const admin = createSupabaseAdminClient();

    const { data: state, error: stateError } = await admin.rpc("get_auth_account_state", { p_email: email.to });
    if (stateError) {
      return this.failed("account_lookup_failed", stateError.message);
    }

    if (state === "confirmed") {
      const { error } = await createSupabaseStatelessClient().auth.signInWithOtp({
        email: email.to,
        options: { shouldCreateUser: false, emailRedirectTo: email.acceptUrl },
      });
      return error ? this.failed(error.code ?? "sign_in_link_failed", error.message) : { delivered: true, channel: this.channel };
    }

    const { error } = await admin.auth.admin.inviteUserByEmail(email.to, {
      redirectTo: email.acceptUrl,
      data: {
        // Metadata is only applied when Supabase creates the user. It marks the
        // account as having no password yet and feeds the invite template.
        needs_password: true,
        invited_by_name: email.inviterName,
        couple_label: email.coupleLabel,
        invitation_expires_on: new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(email.expiresAt),
      },
    });

    return error ? this.failed(error.code ?? "invite_failed", error.message) : { delivered: true, channel: this.channel };
  }

  private failed(reason: string, detail: string): DeliveryResult {
    // The accept URL contains the token; never log it.
    console.error(`[invitations] Supabase Auth delivery failed: ${reason}: ${detail}`);
    return { delivered: false, channel: this.channel, reason };
  }
}
