import type { Metadata } from "next";
import { MailCheck } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Check your email" };

export default function CheckEmailPage() {
  return (
    <div className="os-card p-8 text-center sm:p-10">
      <div className="mx-auto mb-5 grid size-14 place-items-center rounded-full bg-accent-soft text-accent">
        <MailCheck className="size-6" aria-hidden />
      </div>
      <h1 className="os-display text-3xl text-ink">Check your email</h1>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
        We sent you a link to confirm your address. Open it on this device or any other, and you&apos;ll continue right where you left
        off.
      </p>
      <p className="mt-8 text-sm text-muted">
        Already confirmed?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
