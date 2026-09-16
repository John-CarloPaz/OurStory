"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import type { InvitationOutcome } from "@/lib/invitations/service";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(new Date(iso));
}

/**
 * Tells the inviter where the invitation went. If the email could not be
 * delivered (for example Supabase's default SMTP limits, or console delivery
 * in development), shows the private link so they can share it themselves.
 * The link only works for the invited email address.
 */
export function InvitationDeliveryNotice({ outcome }: { outcome: InvitationOutcome }) {
  const [copied, setCopied] = useState(false);

  if (outcome.delivered || !outcome.shareUrl) {
    return (
      <div className="mt-4 space-y-3 text-[0.9375rem] leading-relaxed text-muted">
        <p>We&apos;ve sent an invitation to:</p>
        <p className="os-display text-xl break-all text-ink">{outcome.invitedEmail}</p>
        <p>They can join your private space through the link in their email. It expires on {formatDate(outcome.expiresAt)}.</p>
      </div>
    );
  }

  const shareUrl = outcome.shareUrl;
  return (
    <div className="mt-4 space-y-3 text-left text-[0.9375rem] leading-relaxed text-muted">
      <p>
        Your invitation for <span className="font-medium text-ink">{outcome.invitedEmail}</span> is ready, but we couldn&apos;t email
        it automatically. Send them this private link. It only works for that email address and expires on{" "}
        {formatDate(outcome.expiresAt)}.
      </p>
      <div className="flex items-center gap-2 rounded-xl border border-line bg-field p-2 pl-3">
        <code className="min-w-0 flex-1 truncate text-sm text-ink">{shareUrl}</code>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
          }}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-accent px-3.5 text-sm font-medium text-on-accent"
        >
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
