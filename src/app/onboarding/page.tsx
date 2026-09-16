import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPendingInviteToken } from "@/lib/cookies";
import { APP_NAME } from "@/lib/env";
import { getInvitationPreview } from "@/lib/invitations/service";
import { getMemberships, requireAccount } from "@/lib/tenant";
import { CreateSpaceForm } from "./create-space-form";

export const metadata: Metadata = { title: "Create your space" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await requireAccount("/onboarding");
  const memberships = await getMemberships();
  const { another } = await searchParams;

  if (memberships.length > 0 && another !== "1") redirect("/home");

  // Someone who arrived through an invitation should join, not start a new space.
  if (memberships.length === 0) {
    const pending = await getPendingInviteToken();
    if (pending) {
      const preview = await getInvitationPreview(session, pending);
      if (preview.status === "valid") redirect(`/invite/${pending}`);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 py-12">
      <Link href="/home" className="os-display mb-8 block text-center text-2xl text-ink">
        {APP_NAME} <span className="text-accent">♡</span>
      </Link>
      <CreateSpaceForm defaultName={session.metadata.display_name ?? ""} />
    </main>
  );
}
