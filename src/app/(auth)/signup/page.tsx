import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { safeRedirectPath } from "@/lib/redirects";
import { getSession } from "@/lib/tenant";
import { SignUpForm } from "./signup-form";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { next } = await searchParams;
  const safeNext = safeRedirectPath(next, "");
  if (await getSession()) redirect(safeNext || "/home");

  return (
    <div className="os-card p-8 sm:p-10">
      <h1 className="os-display text-3xl text-ink">Start your story</h1>
      <p className="mt-2 text-[0.9375rem] text-muted">Create an account, then make a private space for the two of you.</p>
      <SignUpForm next={safeNext} />
      <p className="mt-8 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href={safeNext ? `/login?next=${encodeURIComponent(safeNext)}` : "/login"} className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
