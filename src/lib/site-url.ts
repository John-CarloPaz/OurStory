/**
 * The public URL of this deployment, used in every email link and invitation
 * link. Server-side only.
 *
 * Read when a request is handled, not at build time. Next.js bakes literal
 * `process.env.NEXT_PUBLIC_*` references into the build, so a variable added
 * or changed after a deploy would otherwise keep producing the old value
 * (often the localhost fallback). Looking the name up dynamically avoids that.
 *
 * Order:
 *   1. SITE_URL or NEXT_PUBLIC_SITE_URL, when set and not a localhost address
 *      on a hosted deployment
 *   2. On Vercel: the project's production domain in production, or the
 *      branch/deployment domain in previews (system environment variables)
 *   3. The configured value (localhost is expected in local development)
 */

const LOCAL_HOST = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i;

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function normalize(url: string): string {
  const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  return withProtocol.replace(/\/+$/, "");
}

export function getSiteUrl(): string {
  const configured = env("SITE_URL") ?? env("NEXT_PUBLIC_SITE_URL");
  const onVercel = Boolean(env("VERCEL"));

  if (configured && !(onVercel && LOCAL_HOST.test(configured))) {
    return normalize(configured);
  }

  if (onVercel) {
    const host =
      env("VERCEL_ENV") === "production"
        ? (env("VERCEL_PROJECT_PRODUCTION_URL") ?? env("VERCEL_URL"))
        : (env("VERCEL_BRANCH_URL") ?? env("VERCEL_URL"));
    if (host) return normalize(host);
  }

  return normalize(configured ?? "http://localhost:3000");
}
