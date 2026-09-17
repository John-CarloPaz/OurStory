import type { CSSProperties, ReactNode } from "react";
import { Doodle, Stamp } from "@/components/decor/materials";
import { SvgStickerArt } from "@/components/scrapbook/stickers";

/**
 * The invitation card, dressed as a letter: airmail edging, a postage stamp
 * with a postmark, and (for invitations that can still be accepted) a wax seal.
 * Decoration only; every branch's content is passed in as children.
 */

const AIRMAIL: CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(135deg, #d9544f 0 14px, transparent 14px 22px, #4b79c4 22px 36px, transparent 36px 44px)",
};

/** A wobbly wax-drip outline, computed once. */
const SEAL_PATH = (() => {
  const points = 22;
  const coords: string[] = [];
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const radius = i % 2 === 0 ? 30.5 : 28 + ((i * 7) % 3) * 0.6;
    coords.push(`${(32 + radius * Math.cos(angle)).toFixed(2)} ${(32 + radius * Math.sin(angle)).toFixed(2)}`);
  }
  return `M${coords.join("L")}Z`;
})();

function WaxSeal() {
  return (
    <div aria-hidden className="pointer-events-none absolute -bottom-8 left-1/2 z-20 -translate-x-1/2 select-none">
      <div className="os-pop [--pop-rotate:-30deg] [animation-delay:350ms]">
        <div className="relative grid size-16 -rotate-12 place-items-center">
          <svg viewBox="0 0 64 64" className="absolute inset-0 size-full drop-shadow-[0_8px_10px_rgb(90_20_20/0.35)]">
            <defs>
              <radialGradient id="invite-wax-seal" cx="36%" cy="30%" r="75%">
                <stop offset="0%" stopColor="#e8716a" />
                <stop offset="45%" stopColor="#b3312f" />
                <stop offset="100%" stopColor="#761a1e" />
              </radialGradient>
            </defs>
            <path d={SEAL_PATH} fill="url(#invite-wax-seal)" strokeLinejoin="round" stroke="#8f2326" strokeWidth="1.5" />
            <circle cx="32" cy="32" r="19.5" fill="none" stroke="rgb(60 0 0 / 0.28)" strokeWidth="2.5" />
            <circle cx="31.3" cy="31.3" r="19.5" fill="none" stroke="rgb(255 210 200 / 0.28)" strokeWidth="1" />
          </svg>
          <Doodle kind="heart" className="relative size-7 text-[#ffd9d2]/85" />
        </div>
      </div>
    </div>
  );
}

function PostageCorner({ addressed }: { addressed: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none relative mb-4 flex h-[4.75rem] items-start justify-between gap-4 select-none">
      {/* Envelope flap fold lines behind the header. */}
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="absolute -top-5 -left-6 h-24 w-[calc(100%+3rem)] text-ink/10 sm:-left-10 sm:w-[calc(100%+5rem)]">
        <path d="M0 0 50 38 100 0" fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      {addressed ? (
        <p className="os-hand relative mt-4 -rotate-3 border-b border-dashed border-line pr-4 pb-0.5 text-2xl leading-none text-muted">
          to: you ♡
        </p>
      ) : (
        <span />
      )}
      <div className="relative mt-1 mr-1">
        <svg viewBox="0 0 90 40" className="absolute top-3 -left-16 h-9 w-20 text-accent/45">
          <path
            d="M2 8c9-6 13 6 22 0s13 6 22 0 13 6 22 0 13 6 20 0M2 20c9-6 13 6 22 0s13 6 22 0 13 6 22 0 13 6 20 0M2 32c9-6 13 6 22 0s13 6 22 0 13 6 22 0 13 6 20 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <div className="os-sticker w-14 rotate-6">
          <SvgStickerArt id="love-stamp" />
        </div>
        <Stamp tilt={-14} className="absolute top-9 -left-12 text-[0.58rem] leading-tight">
          Private post
        </Stamp>
      </div>
    </div>
  );
}

export function Envelope({ children, sealed = false }: { children: ReactNode; sealed?: boolean }) {
  return (
    <div className="os-page-enter relative">
      <div className={`os-card relative overflow-hidden px-6 pt-5 sm:px-10 ${sealed ? "pb-14" : "pb-9 sm:pb-10"}`}>
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1.5 opacity-80" style={AIRMAIL} />
        <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 opacity-80" style={AIRMAIL} />
        <PostageCorner addressed={sealed} />
        <div className="relative">{children}</div>
      </div>
      {sealed ? <WaxSeal /> : null}
    </div>
  );
}

/** The inviter's name, written by hand. */
export function InviterName({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`os-hand inline-block -rotate-1 leading-none text-accent ${className}`}>{children}</span>;
}
