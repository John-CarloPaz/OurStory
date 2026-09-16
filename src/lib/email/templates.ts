import { APP_NAME } from "@/lib/env";
import type { InvitationEmail } from "./types";

/**
 * Provider-neutral invitation email content, for channels that send their own
 * HTML. (Supabase Auth uses the dashboard templates in supabase/templates/.)
 */

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function renderInvitationEmail(email: InvitationEmail): { subject: string; text: string; html: string } {
  const expires = new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(email.expiresAt);
  const subject = `${email.inviterName} invited you to join a private space on ${APP_NAME}`;

  const text = [
    `You've been invited to join a private space on ${APP_NAME}.`,
    "",
    `${email.inviterName} invited you to document your story together.`,
    "",
    `Accept the invitation: ${email.acceptUrl}`,
    "",
    `This invitation expires on ${expires}.`,
  ].join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f6f0e6;font-family:Georgia,'Times New Roman',serif;color:#2a211d">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fffdf9;border-radius:20px;padding:40px">
          <tr><td>
            <p style="margin:0 0 8px;font:600 12px/1.4 -apple-system,Segoe UI,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#b4553d">${escapeHtml(APP_NAME)}</p>
            <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;font-weight:500">You've been invited to join a private space.</h1>
            <p style="margin:0 0 28px;font-size:17px;line-height:1.6">${escapeHtml(email.inviterName)} invited you to document your story together.</p>
            <a href="${escapeHtml(email.acceptUrl)}" style="display:inline-block;background:#b4553d;color:#fff;text-decoration:none;padding:14px 26px;border-radius:999px;font:600 15px/1 -apple-system,Segoe UI,sans-serif">Accept Invitation</a>
            <p style="margin:28px 0 0;font:14px/1.6 -apple-system,Segoe UI,sans-serif;color:#7a6c64">This invitation expires on ${escapeHtml(expires)}.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}
