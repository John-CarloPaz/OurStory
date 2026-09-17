"use client";

import { RotateCcw } from "lucide-react";
import type { CSSProperties } from "react";
import { Doodle, Tape } from "@/components/decor/materials";
import { buttonClass } from "@/components/ui/button";

export default function SpaceError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="relative mx-auto max-w-lg pt-6">
      <div className="os-card relative overflow-hidden px-6 pt-14 pb-10 text-center sm:px-10">
        <Doodle kind="heart" className="os-float absolute top-6 right-7 size-9 text-accent/25" />
        <Doodle kind="squiggle" className="absolute bottom-6 left-6 h-6 w-16 text-accent/20" />

        <div aria-hidden className="pointer-events-none relative mx-auto mb-7 w-40 select-none">
          <div className="os-pop">
            <div className="os-sticky relative px-4 pt-6 pb-5" style={{ "--note": "#f6d3db", "--tilt": "4deg" } as CSSProperties}>
              <Tape className="absolute -top-3 left-1/2 w-16 -translate-x-1/2" rotate={-5} pattern="stripes" />
              <p className="os-hand text-2xl leading-tight">be right back ♡</p>
            </div>
          </div>
        </div>

        <p className="os-eyebrow">Something went wrong</p>
        <h1 className="os-display mt-3 text-3xl leading-tight font-medium text-ink">This part of your space didn&apos;t load.</h1>
        <p className="mt-3 text-muted">Please try again. If it keeps happening, refresh the page.</p>
        <button type="button" onClick={reset} className={buttonClass("primary", "md", "mt-8")}>
          <RotateCcw className="size-4" aria-hidden />
          Try again
        </button>
      </div>
    </div>
  );
}
