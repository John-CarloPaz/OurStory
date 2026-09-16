import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { safeRedirectPath } from "@/lib/redirects";
import { requireSession } from "@/lib/tenant";
import { AccountSetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Finish your account" };

export default async function AccountSetupPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { next } = await searchParams;
  const session = await requireSession("/account/setup");
  if (!session.metadata.needs_password) redirect(safeRedirectPath(next, "/home"));

  return (
    <div className="os-card p-8 sm:p-10">
      <h1 className="os-display text-3xl text-ink">Finish your account</h1>
      <p className="mt-2 text-[0.9375rem] text-muted">Choose a password so you can sign in next time.</p>
      <AccountSetupForm email={session.email} defaultName={session.metadata.display_name ?? ""} next={safeRedirectPath(next, "")} />
    </div>
  );
}
