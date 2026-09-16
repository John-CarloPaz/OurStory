import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { PENDING_INVITE_COOKIE } from "@/lib/redirects";

/**
 * 1. Refreshes the Supabase session cookie on every request.
 * 2. Sends signed-out visitors of workspace routes to /login.
 * 3. Remembers the invitation a visitor arrived with, so the invitation
 *    survives sign-up and email verification even if a redirect drops it.
 *
 * This is a convenience layer. Authorization is enforced by RLS and by the
 * server-side checks in every page and Server Action.
 */

const PUBLIC_PREFIXES = ["/login", "/signup", "/forgot-password", "/check-email", "/auth", "/invite"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
          for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
        },
      },
    },
  );

  // Verifies the JWT (signature + expiry) and refreshes it when needed.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  const { pathname } = request.nextUrl;

  const inviteMatch = pathname.match(/^\/invite\/([A-Za-z0-9_-]{43})$/);
  if (inviteMatch) {
    response.cookies.set(PENDING_INVITE_COOKIE, inviteMatch[1], {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  const isPublic = pathname === "/" || PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!signedIn && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`;
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)"],
};
