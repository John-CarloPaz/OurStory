"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { Doodle, Tape } from "@/components/decor/materials";
import { buttonClass } from "@/components/ui/button";

/** Last-resort error screen. Never shows internals; details stay in server logs. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-x-clip px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div aria-hidden className="pointer-events-none relative mx-auto mb-10 w-48 select-none">
          <div className="os-pop">
            <div className="os-sticky relative px-5 pt-8 pb-7" style={{ "--note": "#fff1a8", "--tilt": "-5deg" } as CSSProperties}>
              <Tape className="absolute -top-3 left-1/2 w-20 -translate-x-1/2" rotate={4} pattern="checks" color="#b5d8f0" />
              <p className="os-hand text-3xl leading-none">oops!</p>
              <p className="os-hand mt-2 text-xl leading-snug opacity-75">the ink smudged. give it another go?</p>
              <svg viewBox="0 0 60 20" className="mx-auto mt-2 h-5 w-16 text-[#b4553d]/60">
                <path d="M4 12c6-8 10 6 16 0s10 6 16 0 10 6 20-2" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <Doodle kind="sparkle" className="os-float absolute -top-4 -right-8 size-7 text-accent/60" />
          <Doodle kind="circle" className="os-float absolute -bottom-3 -left-9 size-9 text-accent/35 [animation-delay:-3s]" />
        </div>

        <p className="os-eyebrow">Something went wrong</p>
        <h1 className="os-display mt-3 text-4xl leading-tight font-medium text-ink">We couldn&apos;t load this page.</h1>
        <p className="mt-3 text-muted">Please try again in a moment. Nothing you wrote has been lost.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={reset} className={buttonClass("primary", "lg")}>
            Try again
          </button>
          <Link href="/" className={buttonClass("secondary", "lg")}>
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
