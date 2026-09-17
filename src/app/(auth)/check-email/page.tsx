import type { Metadata } from "next";
import { MailCheck } from "lucide-react";
import Link from "next/link";
import { Doodle } from "@/components/decor/materials";
import { AuthCard, authLinkClass } from "@/components/decor/scene";

export const metadata: Metadata = { title: "Check your email" };

export default function CheckEmailPage() {
  return (
    <AuthCard
      center
      title="Check your email"
      icon={
        <div aria-hidden className="relative mx-auto mb-5 w-fit">
          <div className="os-pop [animation-delay:150ms]">
            <div className="grid size-16 -rotate-6 place-items-center rounded-2xl bg-accent-soft text-accent shadow-sm">
              <MailCheck className="size-7" />
            </div>
          </div>
          <Doodle kind="sparkle" className="os-float absolute -top-3 -right-5 size-6 text-accent/70" />
          <Doodle kind="heart" className="os-float absolute -bottom-2 -left-6 size-5 text-accent/50 [animation-delay:-2.5s]" />
        </div>
      }
    >
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
        We sent you a link to confirm your address. Open it on this device or any other, and you&apos;ll continue right where you left
        off.
      </p>
      <p aria-hidden className="os-hand mt-4 -rotate-1 text-2xl text-accent">
        go peek at your inbox ♡
      </p>
      <p className="mt-6 border-t border-dashed border-line pt-5 text-sm text-muted">
        Already confirmed?{" "}
        <Link href="/login" className={authLinkClass}>
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
