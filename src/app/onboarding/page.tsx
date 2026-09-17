import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPendingInviteToken } from "@/lib/cookies";
import { getInvitationPreview } from "@/lib/invitations/service";
import { getMemberships, requireAccount } from "@/lib/tenant";
import { BrandMark } from "@/components/decor/scene";
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
    <main className="relative min-h-dvh overflow-x-clip px-4 py-10 sm:py-16">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-xl flex-col justify-center sm:min-h-[calc(100dvh-8rem)]">
        <BrandMark href="/home" className="mx-auto mb-10 text-2xl" />
        <CreateSpaceForm defaultName={session.metadata.display_name ?? ""} />
      </div>
    </main>
  );
}
