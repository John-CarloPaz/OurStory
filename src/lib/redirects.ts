import { getSiteUrl } from "@/lib/site-url";

/**
 * Turns an untrusted `next` / `redirect_to` value into a same-origin path.
 * Anything off-site, protocol-relative or malformed falls back.
 * A nested /auth/confirm?next=... is unwrapped, so older email links that
 * pointed at /auth/confirm directly still land on the right page.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = "/"): string {
  if (!value) return fallback;

  let url: URL;
  try {
    url = new URL(value, getSiteUrl());
  } catch {
    return fallback;
  }

  const site = new URL(getSiteUrl());
  const isRelative = value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\");
  if (!isRelative && url.origin !== site.origin) return fallback;

  if (url.pathname === "/auth/confirm") {
    return safeRedirectPath(url.searchParams.get("next"), fallback);
  }

  return `${url.pathname}${url.search}`;
}

export const PENDING_INVITE_COOKIE = "os_pending_invite";
export const ACTIVE_COUPLE_COOKIE = "os_active_couple";
