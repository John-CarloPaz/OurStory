import "server-only";
import { cookies } from "next/headers";
import { isWellFormedInvitationToken } from "@/lib/invitations/token";
import { ACTIVE_COUPLE_COOKIE, PENDING_INVITE_COOKIE } from "@/lib/redirects";

/**
 * Cookie helpers for Server Actions and Route Handlers.
 * None of these cookies grant access to anything:
 *   - active couple: a preference, re-validated against membership on every request
 *   - pending invite: remembers the invitation link across sign-up/verification
 *   - auto join: set only by /auth/confirm after Supabase verified an email link
 */

export const AUTO_JOIN_COOKIE = "os_auto_join";

const base = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function setActiveCoupleCookie(coupleId: string) {
  (await cookies()).set(ACTIVE_COUPLE_COOKIE, coupleId, { ...base, maxAge: 60 * 60 * 24 * 365 });
}

export async function getPendingInviteToken(): Promise<string | null> {
  const value = (await cookies()).get(PENDING_INVITE_COOKIE)?.value;
  return isWellFormedInvitationToken(value) ? value : null;
}

export async function clearInvitationCookies() {
  const store = await cookies();
  store.delete(PENDING_INVITE_COOKIE);
  store.delete(AUTO_JOIN_COOKIE);
}
