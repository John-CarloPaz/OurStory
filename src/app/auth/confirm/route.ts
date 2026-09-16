import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { AUTO_JOIN_COOKIE } from "@/lib/cookies";
import { isWellFormedInvitationToken } from "@/lib/invitations/token";
import { PENDING_INVITE_COOKIE, safeRedirectPath } from "@/lib/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Landing point for Supabase Auth email links (sign-up confirmation, password
 * recovery, invite and magic-link emails when the recommended templates in
 * supabase/templates are installed).
 *
 * Accepts either ?token_hash=&type= (verifyOtp, works across devices) or
 * ?code= (PKCE exchange, same browser). Then continues to `next`, or to the
 * invitation the visitor started from, so invitation context survives email
 * verification.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const code = params.get("code");

  const supabase = await createSupabaseServerClient();

  let verified = false;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    verified = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    verified = !error;
  }

  const pendingInvite = request.cookies.get(PENDING_INVITE_COOKIE)?.value;
  let destination = safeRedirectPath(params.get("next") ?? params.get("redirect_to"), "");
  if (!destination || destination === "/" || destination === "/home" || destination === "/onboarding") {
    if (isWellFormedInvitationToken(pendingInvite)) destination = `/invite/${pendingInvite}`;
  }
  if (!destination) destination = "/home";

  if (!verified) {
    const { data } = await supabase.auth.getClaims();
    if (!data?.claims?.sub) {
      return NextResponse.redirect(new URL(`/login?error=link_expired&next=${encodeURIComponent(destination)}`, request.url));
    }
  }

  const response = NextResponse.redirect(new URL(destination, request.url));

  // The visitor just proved ownership of their email through a link Supabase
  // issued. If they are headed to an invitation, let that page finish joining
  // without another click. Short-lived and bound to that exact token.
  const inviteToken = destination.match(/^\/invite\/([A-Za-z0-9_-]{43})$/)?.[1];
  if (verified && inviteToken) {
    response.cookies.set(AUTO_JOIN_COOKIE, inviteToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 60 * 5,
    });
  }

  return response;
}
