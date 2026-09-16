"use client";

import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

/** Last-resort error screen. Never shows internals; details stay in server logs. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="max-w-md text-center">
        <p className="os-eyebrow">Something went wrong</p>
        <h1 className="os-display mt-3 text-4xl text-ink">We couldn&apos;t load this page.</h1>
        <p className="mt-3 text-muted">Please try again in a moment. Nothing you wrote has been lost.</p>
        <div className="mt-8 flex justify-center gap-3">
          <button type="button" onClick={reset} className={buttonClass("primary")}>
            Try again
          </button>
          <Link href="/" className={buttonClass("secondary")}>
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
