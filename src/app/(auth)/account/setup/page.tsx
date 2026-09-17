import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { safeRedirectPath } from "@/lib/redirects";
import { requireSession } from "@/lib/tenant";
import { AuthCard } from "@/components/decor/scene";
import { AccountSetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Finish your account" };

export default async function AccountSetupPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { next } = await searchParams;
  const session = await requireSession("/account/setup");
  if (!session.metadata.needs_password) redirect(safeRedirectPath(next, "/home"));

  return (
    <AuthCard title="Finish your account" note="almost there" description="Choose a password so you can sign in next time.">
      <AccountSetupForm email={session.email} defaultName={session.metadata.display_name ?? ""} next={safeRedirectPath(next, "")} />
    </AuthCard>
  );
}
