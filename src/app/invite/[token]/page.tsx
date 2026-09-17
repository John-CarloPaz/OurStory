import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import { buttonClass } from "@/components/ui/button";
import { AUTO_JOIN_COOKIE } from "@/lib/cookies";
import { getInvitationPreview, INVITATION_STATUS_COPY } from "@/lib/invitations/service";
import { isWellFormedInvitationToken } from "@/lib/invitations/token";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/tenant";
import { BrandMark } from "@/components/decor/scene";
import { Envelope, InviterName } from "./envelope";
import { ClearPendingInvitation, CompleteInvitedAccountForm, InviteChoice, JoinSpaceForm } from "./invite-forms";
import { SessionFromLink } from "./session-from-link";

export const metadata: Metadata = { title: "You're invited" };

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 1)}${"•".repeat(Math.max(2, local.length - 1))}@${domain}`;
}

/** `sealed` adds the wax seal and address line, for invitations that can still be accepted. */
function Shell({ children, sealed = false }: { children: React.ReactNode; sealed?: boolean }) {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-x-clip px-4 py-10 sm:py-16">
      <div className="w-full max-w-md">
        <BrandMark href="/" className="mx-auto mb-9 text-2xl" />
        <SessionFromLink />
        <Envelope sealed={sealed}>{children}</Envelope>
      </div>
    </main>
  );
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (!isWellFormedInvitationToken(token)) {
    return (
      <Shell>
        <ClearPendingInvitation />
        <h1 className="os-display text-3xl leading-tight font-medium text-ink">{INVITATION_STATUS_COPY.not_found.title}</h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">{INVITATION_STATUS_COPY.not_found.body}</p>
      </Shell>
    );
  }

  const session = await getSession();
  const supabase = session?.supabase ?? (await createSupabaseServerClient());
  const preview = await getInvitationPreview({ supabase }, token);

  if (preview.status === "already_member") redirect("/home");

  if (preview.status !== "valid") {
    const copy = INVITATION_STATUS_COPY[preview.status];
    return (
      <Shell>
        <ClearPendingInvitation />
        <h1 className="os-display text-3xl leading-tight font-medium text-ink">{copy.title}</h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
          {preview.status === "expired" && preview.inviter_name
            ? `Ask ${preview.inviter_name} to send you a new invitation.`
            : copy.body}
        </p>
        <Link href={session ? "/home" : "/login"} className={buttonClass("secondary", "md", "mt-8")}>
          {session ? "Go to your space" : "Sign in"}
        </Link>
      </Shell>
    );
  }

  const inviter = preview.inviter_name ?? "Your partner";
  const email = preview.invited_email!;

  if (!session) {
    return (
      <Shell sealed>
        <p className="os-eyebrow">Private invitation</p>
        <h1 className="os-display mt-3 text-[2.75rem] leading-none font-medium text-ink sm:text-5xl">You&apos;re invited.</h1>
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-muted">
          <InviterName className="mr-1 text-[1.75rem]">{inviter}</InviterName> has invited you to join their private space.
        </p>
        <InviteChoice token={token} email={email} inviter={inviter} />
      </Shell>
    );
  }

  if (preview.viewer_email_matches === false) {
    return (
      <Shell>
        <h1 className="os-display text-3xl leading-tight font-medium text-ink">This invitation is for someone else.</h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed break-words text-muted">
          It was sent to {maskEmail(email)}, but you&apos;re signed in as {session.email}. Sign in with the invited email to accept it.
        </p>
        <form action={signOut} className="mt-8">
          <input type="hidden" name="next" value={`/invite/${token}`} />
          <button type="submit" className={buttonClass("primary", "md", "w-full sm:w-auto")}>
            Sign out and switch account
          </button>
        </form>
      </Shell>
    );
  }

  if (session.metadata.needs_password) {
    return (
      <Shell sealed>
        <p className="os-eyebrow">Almost there</p>
        <h1 className="os-display mt-3 text-3xl leading-tight font-medium text-ink sm:text-4xl">Create your account</h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
          <InviterName className="mr-1 text-[1.6rem]">{inviter}</InviterName> invited you to join Our Story. Choose your name and a
          password, and you&apos;re in.
        </p>
        <CompleteInvitedAccountForm token={token} email={email} defaultName={session.metadata.display_name ?? ""} />
      </Shell>
    );
  }

  const autoJoin = (await cookies()).get(AUTO_JOIN_COOKIE)?.value === token;

  return (
    <Shell sealed>
      <p className="os-eyebrow">Welcome back.</p>
      <h1 className="os-display mt-3 text-3xl leading-tight font-medium text-ink">You&apos;ve been invited to join:</h1>
      <p className="os-display mt-4 text-2xl leading-snug text-accent">
        <InviterName className="mr-0.5 text-[2.1rem]">{inviter}&apos;s</InviterName> Our Story space.
      </p>
      <JoinSpaceForm token={token} autoSubmit={autoJoin} />
    </Shell>
  );
}
