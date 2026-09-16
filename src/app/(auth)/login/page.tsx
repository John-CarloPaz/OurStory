import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/tenant";
import { safeRedirectPath } from "@/lib/redirects";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { next, error } = await searchParams;
  const safeNext = safeRedirectPath(next, "");

  if (await getSession()) redirect(safeNext || "/home");

  return (
    <div className="os-card p-8 sm:p-10">
      <h1 className="os-display text-3xl text-ink">Welcome back</h1>
      <p className="mt-2 text-[0.9375rem] text-muted">Sign in to your private space.</p>
      {error === "link_expired" ? (
        <p className="mt-6 rounded-xl bg-accent-soft px-4 py-3 text-sm text-ink">
          That email link has expired or was already used. Sign in below to continue.
        </p>
      ) : null}
      <LoginForm next={safeNext} />
      <p className="mt-8 text-center text-sm text-muted">
        New here?{" "}
        <Link href={safeNext ? `/signup?next=${encodeURIComponent(safeNext)}` : "/signup"} className="font-medium text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
