"use client";

import { buttonClass } from "@/components/ui/button";

export default function SpaceError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="os-card mx-auto max-w-lg px-6 py-12 text-center">
      <p className="os-eyebrow">Something went wrong</p>
      <h1 className="os-display mt-3 text-3xl text-ink">This part of your space didn&apos;t load.</h1>
      <p className="mt-3 text-muted">Please try again. If it keeps happening, refresh the page.</p>
      <button type="button" onClick={reset} className={buttonClass("primary", "md", "mt-8")}>
        Try again
      </button>
    </div>
  );
}
