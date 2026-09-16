/**
 * Email delivery abstraction.
 *
 * Business logic (creating spaces, resending invitations) depends only on
 * InvitationMailer. Concrete delivery lives in one file per channel:
 *
 *   supabase-auth-mailer.ts  default — Supabase Auth's own emails, no extra provider
 *   console-mailer.ts        development — prints the link instead of sending
 *
 * To add a transactional provider later (Resend, Postmark, SES, SMTP...), add
 * a file that implements InvitationMailer using renderInvitationEmail() and
 * register it in ./index.ts. Nothing else changes.
 */

export type InvitationEmail = {
  to: string;
  acceptUrl: string;
  inviterName: string;
  coupleLabel: string;
  expiresAt: Date;
};

export type DeliveryResult =
  | { delivered: true; channel: string }
  | { delivered: false; channel: string; reason: string };

export interface InvitationMailer {
  readonly channel: string;
  sendInvitation(email: InvitationEmail): Promise<DeliveryResult>;
}
