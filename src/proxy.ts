import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { PENDING_INVITE_COOKIE } from "@/lib/redirects";

/**
 * 1. Hands Supabase email links to /auth/confirm. Emails link to the page the
 *    app asked for (e.g. /invite/<token>, /onboarding) with ?token_hash=&type=
 *    or ?code= attached; those are verified there, then the visitor continues
 *    to that page. Links therefore follow the app's own site URL, not the
 *    Supabase dashboard's Site URL.
 * 2. Refreshes the Supabase session cookie on every request.
 * 3. Sends signed-out visitors of workspace routes to /login.
 * 4. Remembers the invitation a visitor arrived with, so the invitation
 *    survives sign-up and email verification even if a redirect drops it.
 *
 * This is a convenience layer. Authorization is enforced by RLS and by the
 * server-side checks in every page and Server Action.
 */

const PUBLIC_PREFIXES = ["/login", "/signup", "/forgot-password", "/check-email", "/auth", "/invite"];
const AUTH_CALLBACK_PARAMS = ["token_hash", "type", "code"];

function authCallbackRedirect(request: NextRequest): NextResponse | null {
  const { pathname, searchParams } = request.nextUrl;
  if (pathname === "/auth/confirm") return null;
  const hasTokenHash = searchParams.has("token_hash") && searchParams.has("type");
  if (!hasTokenHash && !searchParams.has("code")) return null;

  const remaining = new URLSearchParams(searchParams);
  const forwarded = new URLSearchParams();
  for (const key of AUTH_CALLBACK_PARAMS) {
    const value = searchParams.get(key);
    if (value) forwarded.set(key, value);
    remaining.delete(key);
  }
  const rest = remaining.toString();
  forwarded.set("next", `${pathname}${rest ? `?${rest}` : ""}`);

  const url = request.nextUrl.clone();
  url.pathname = "/auth/confirm";
  url.search = `?${forwarded.toString()}`;
  return NextResponse.redirect(url);
}

function rememberInvitation(request: NextRequest, response: NextResponse) {
  const match = request.nextUrl.pathname.match(/^\/invite\/([A-Za-z0-9_-]{43})$/);
  if (!match) return;
  response.cookies.set(PENDING_INVITE_COOKIE, match[1], {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function proxy(request: NextRequest) {
  const callback = authCallbackRedirect(request);
  if (callback) {
    rememberInvitation(request, callback);
    return callback;
  }

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
  rememberInvitation(request, response);

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
