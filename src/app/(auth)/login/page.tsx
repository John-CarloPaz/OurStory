import { Clock3 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/tenant";
import { safeRedirectPath } from "@/lib/redirects";
import { AuthCard, authLinkClass } from "@/components/decor/scene";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { next, error } = await searchParams;
  const safeNext = safeRedirectPath(next, "");

  if (await getSession()) redirect(safeNext || "/home");

  return (
    <AuthCard title="Welcome back" note="good to see you" description="Sign in to your private space.">
      {error === "link_expired" ? (
        <p className="os-pop mt-6 flex gap-3 rounded-2xl bg-accent-soft px-4 py-3 text-sm leading-relaxed text-ink">
          <Clock3 className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
          <span>That email link has expired or was already used. Sign in below to continue.</span>
        </p>
      ) : null}
      <LoginForm next={safeNext} />
      <p className="mt-7 border-t border-dashed border-line pt-5 text-center text-sm text-muted">
        New here?{" "}
        <Link href={safeNext ? `/signup?next=${encodeURIComponent(safeNext)}` : "/signup"} className={authLinkClass}>
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}
