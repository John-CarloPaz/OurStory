import "server-only";
import { renderInvitationEmail } from "./templates";
import type { DeliveryResult, InvitationEmail, InvitationMailer } from "./types";

/**
 * Development channel: prints the invitation instead of sending it and reports
 * "not delivered", so the UI shows the inviter a shareable link.
 */
export class ConsoleInvitationMailer implements InvitationMailer {
  readonly channel = "console";

  async sendInvitation(email: InvitationEmail): Promise<DeliveryResult> {
    const { subject, text } = renderInvitationEmail(email);
    console.info(`\n[invitations] To: ${email.to}\nSubject: ${subject}\n\n${text}\n`);
    return { delivered: false, channel: this.channel, reason: "console_delivery" };
  }
}
