import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { safeRedirectPath } from "@/lib/redirects";
import { getSession } from "@/lib/tenant";
import { AuthCard, authLinkClass } from "@/components/decor/scene";
import { SignUpForm } from "./signup-form";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { next } = await searchParams;
  const safeNext = safeRedirectPath(next, "");
  if (await getSession()) redirect(safeNext || "/home");

  return (
    <AuthCard
      title="Start your story"
      note="page one ✎"
      description="Create an account, then make a private space for the two of you."
    >
      <SignUpForm next={safeNext} />
      <p className="mt-7 border-t border-dashed border-line pt-5 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href={safeNext ? `/login?next=${encodeURIComponent(safeNext)}` : "/login"} className={authLinkClass}>
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
