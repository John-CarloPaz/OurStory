import Link from "next/link";
import type { CSSProperties } from "react";
import { Doodle, Tape } from "@/components/decor/materials";
import { buttonClass } from "@/components/ui/button";

/** A ragged bottom edge, as if the page was torn out. Computed once. */
const TORN_EDGE = (() => {
  const teeth = 18;
  const points = ["0 0", "100% 0"];
  for (let i = teeth; i >= 0; i--) {
    const x = (i / teeth) * 100;
    const y = i % 2 === 0 ? 90 + ((i * 5) % 4) : 97 - ((i * 3) % 3);
    points.push(`${x.toFixed(2)}% ${y}%`);
  }
  return `polygon(${points.join(", ")})`;
})();

const LINED: CSSProperties = {
  backgroundImage:
    "linear-gradient(90deg, transparent 2.1rem, rgb(220 90 90 / 0.35) 2.1rem 2.2rem, transparent 2.2rem), " +
    "repeating-linear-gradient(transparent 0 1.45rem, rgb(90 130 190 / 0.22) 1.45rem 1.5rem)",
  backgroundPosition: "0 0, 0 0.9rem",
  clipPath: TORN_EDGE,
};

export default function NotFound() {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-x-clip px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div aria-hidden className="pointer-events-none relative mx-auto mb-10 w-52 select-none sm:w-60">
          <div className="os-pop" style={{ "--pop-rotate": "8deg" } as CSSProperties}>
            <div className="rotate-[-4deg] drop-shadow-[0_18px_22px_rgb(40_25_10/0.25)]">
              <div className="os-paper relative aspect-[4/5] px-5 pt-7 pb-10 text-left text-[#3b2f2a]" style={LINED}>
                <p className="font-typewriter pl-6 text-xs tracking-widest text-[#3b2f2a]/60 uppercase">
                  page
                </p>
                <p className="os-hand pl-6 text-6xl leading-none">404</p>
                <p className="os-hand mt-2 pl-6 text-xl leading-snug text-[#3b2f2a]/75">
                  this one got
                  <br />
                  torn out…
                </p>
                <Doodle kind="squiggle" className="mt-1 ml-6 h-6 w-20 text-[#b4553d]/60" />
              </div>
            </div>
          </div>
          <Tape className="absolute -top-3 left-1/2 z-10 -translate-x-1/2" rotate={-6} />
          <Doodle kind="star" className="os-float absolute top-6 -right-10 size-8 text-accent/60" />
          <Doodle kind="heart" className="os-float absolute bottom-10 -left-10 size-7 text-accent/40 [animation-delay:-2.5s]" />
        </div>

        <p className="os-eyebrow">Not found</p>
        <h1 className="os-display mt-3 text-4xl leading-tight font-medium text-ink">This page isn&apos;t part of your story.</h1>
        <p className="mt-3 text-muted">It may have been deleted, or it belongs to a space you&apos;re not in.</p>
        <Link href="/home" className={buttonClass("primary", "lg", "mt-8")}>
          Back home
        </Link>
      </div>
    </main>
  );
}
