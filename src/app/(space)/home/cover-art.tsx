import type { CSSProperties } from "react";
import { Doodle, Polaroid, StickyNote, Tape } from "@/components/decor/materials";
import { SvgStickerArt } from "@/components/scrapbook/stickers";

/** Presentational pieces for the home "scrapbook cover". Server-safe, no state. */

/** Cuts two half-circle notches along one edge, like a torn-off ticket stub. */
function notches(edge: "left" | "right"): CSSProperties {
  const x = edge === "right" ? "100%" : "0";
  const mask = `radial-gradient(circle 0.6rem at ${x} 0, transparent 97%, #000), radial-gradient(circle 0.6rem at ${x} 100%, transparent 97%, #000)`;
  // Where mask compositing is unsupported the layers add up and the ticket simply stays rectangular.
  return { WebkitMaskImage: mask, maskImage: mask, WebkitMaskComposite: "source-in", maskComposite: "intersect" };
}

export function TicketStub({ since, days }: { since: string; days: number | null }) {
  return (
    <p className="inline-flex max-w-full -rotate-2 items-stretch text-[#3b2f2a] drop-shadow-[0_14px_18px_rgb(40_25_10/0.25)]">
      <span className="flex min-w-0 flex-col justify-center gap-1 rounded-l-md bg-[#fff7e6] py-3 pr-5 pl-4 sm:pl-5" style={days !== null ? notches("right") : undefined}>
        <span className="font-typewriter text-[0.66rem] tracking-[0.2em] uppercase opacity-75">Together since</span>
        <span className="os-display text-lg leading-tight sm:text-xl">{since}</span>
      </span>
      {days !== null ? (
        <span
          className="flex flex-col items-center justify-center rounded-r-md border-l-2 border-dashed border-[#3b2f2a]/25 bg-[#ffe3c2] py-3 pr-4 pl-5 sm:pr-5"
          style={notches("left")}
        >
          <span className="sr-only"> · </span>
          <span className="os-display text-2xl leading-none tabular-nums sm:text-3xl">{days.toLocaleString()}</span>
          <span className="font-typewriter mt-1 text-[0.66rem] tracking-[0.2em] uppercase opacity-75">{days === 1 ? " day" : " days"}</span>
        </span>
      ) : null}
    </p>
  );
}

/** The couple's cover photo as a big taped polaroid with a paper card peeking out behind it. */
export function CoverPolaroid({ src, caption }: { src: string; caption?: string }) {
  return (
    <div className="relative mx-auto w-full max-w-[21rem] px-3 pt-4 pb-3 sm:max-w-md">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-10 top-10 bottom-8 rotate-[7deg] rounded-[3px] bg-[#f1e2cf] shadow-[0_14px_30px_-14px_rgb(40_25_10/0.4)]"
      />
      <div className="os-pop relative" style={{ "--pop-rotate": "-10deg" } as CSSProperties}>
        <Polaroid src={src} alt="" tilt={-3} priority caption={caption} imageClassName="aspect-[4/3]" className="p-3 pb-12 sm:p-3.5 sm:pb-14" />
      </div>
      <Tape className="absolute top-3 -left-1 z-10 w-24" rotate={-38} color="#f6b8c2" pattern="stripes" />
      <Tape className="absolute top-1 -right-2 z-10 w-24" rotate={32} color="#b5d8f0" pattern="dots" />
      <div aria-hidden className="pointer-events-none absolute -right-1 -bottom-4 z-10 w-16 rotate-12 sm:w-20">
        <div className="os-sticker os-float [animation-delay:-3s]">
          <SvgStickerArt id="heart" />
        </div>
      </div>
    </div>
  );
}

/** A little sticker collage for couples who haven't picked a cover photo yet. Purely decorative. */
export function CoverCollage() {
  return (
    <div aria-hidden className="pointer-events-none relative mx-auto aspect-square w-full max-w-[19rem] select-none sm:max-w-sm">
      <div className="absolute top-[9%] left-[10%] w-[60%] rotate-[-6deg]">
        <Polaroid src={null} caption="page one" imageClassName="aspect-square" className="pb-10">
          <Doodle kind="heart" className="absolute top-[42%] left-1/2 size-[34%] -translate-x-1/2 -translate-y-1/2 text-[#c98f7a]" />
        </Polaroid>
      </div>
      <Tape className="absolute top-[5%] left-[26%] z-10 w-24" rotate={-8} color="#ffcf99" pattern="grid" />

      <div className="absolute top-[2%] right-[4%] w-[30%] rotate-[9deg]">
        <div className="os-sticker os-float [animation-delay:-2s]">
          <SvgStickerArt id="love-stamp" />
        </div>
      </div>

      <div className="absolute right-[3%] bottom-[7%] w-[50%]">
        <StickyNote tilt={4} color="#fff1a8" className="px-4 pt-4 pb-5">
          <p className="os-hand text-2xl leading-tight">our story, told together ♡</p>
        </StickyNote>
      </div>

      <div className="absolute bottom-[8%] left-[4%] w-[30%] rotate-[-12deg]">
        <div className="os-sticker os-float">
          <SvgStickerArt id="xoxo" />
        </div>
      </div>

      <Doodle kind="sparkle" className="absolute top-[58%] left-[64%] size-8 text-accent/60" />
    </div>
  );
}
