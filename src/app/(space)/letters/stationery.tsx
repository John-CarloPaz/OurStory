import { Heart } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

/**
 * Letter stationery: envelopes, wax seals, postmarks and stamps. These are
 * paper materials, so they keep light paper colors and dark ink in every
 * theme; only the wax and stamp ink pick up the couple's accent color.
 * Presentational only.
 */

export const PAPER_INK = "#3b2f2a";

/** Accent-tinted ink that stays legible on light paper, even on dark themes. */
export const STAMP_INK = "color-mix(in srgb, var(--os-primary) 50%, #3b2f2a)";

/**
 * Points the theme tokens at dark-ink-on-paper values, so shared form
 * controls (Field, Input, Textarea) stay legible on a light paper surface in
 * every theme, including Midnight.
 */
export const PAPER_TOKENS = {
  "--os-ink": PAPER_INK,
  "--os-muted": "#76675e",
  "--os-line": "rgb(59 47 42 / 0.16)",
  "--os-field": "#fffdf8",
  "--os-glass": "rgb(255 255 255 / 0.55)",
  "--os-glass-border": "rgb(59 47 42 / 0.16)",
} as CSSProperties;

/** Ruled lines that follow the element's own line height (`lh`). */
export const RULED_LINES =
  "repeating-linear-gradient(to bottom, transparent 0 calc(0.84lh - 1px), rgb(90 130 190 / 0.3) calc(0.84lh - 1px) 0.84lh, transparent 0.84lh 1lh)";

export const AIRMAIL_BORDER =
  "repeating-linear-gradient(135deg, #d8504b 0 12px, #fdf8ee 12px 18px, #3d6db5 18px 30px, #fdf8ee 30px 36px)";

/** Keyframes for opening a letter. Motion is neutralized globally under prefers-reduced-motion. */
const LETTER_MOTION_CSS =
  "@keyframes os-flap-open{from{transform:perspective(800px) rotateX(-180deg)}to{transform:perspective(800px) rotateX(0deg)}}" +
  "@keyframes os-letter-draw{from{opacity:0;transform:translateY(-3rem) scale(0.97)}45%{opacity:1}to{opacity:1;transform:none}}";

export function LetterMotion() {
  return (
    <style href="os-letter-motion" precedence="default">
      {LETTER_MOTION_CSS}
    </style>
  );
}

const ENVELOPE_PAPER = "linear-gradient(165deg, #fcf5e8, #f1e3ca)";
const FLAP_PAPER = "linear-gradient(to bottom, #f8eedb, #ecdabd)";
const ENVELOPE_SHADOW = "0 1px 2px rgb(40 25 10 / 0.14), 0 20px 36px -20px rgb(40 25 10 / 0.5)";
const LINER = "repeating-linear-gradient(135deg, color-mix(in srgb, var(--os-primary) 34%, #fbf1e2) 0 7px, #fbf1e2 7px 14px)";
const DOWN_TRIANGLE = "polygon(0 0, 100% 0, 50% 100%)";
const UP_TRIANGLE = "polygon(0 100%, 50% 0, 100% 100%)";
const HIDE_BACKFACE: CSSProperties = { backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" };

// Wax seal ------------------------------------------------------------------------------

const SEAL_SIZES = {
  sm: "size-9 text-sm",
  md: "size-12 text-lg",
  lg: "size-16 text-2xl",
} as const;

const LEFT_HALF = "polygon(0 0, 54% 0, 47% 24%, 56% 45%, 45% 66%, 53% 84%, 47% 100%, 0 100%)";
const RIGHT_HALF = "polygon(54% 0, 100% 0, 100% 100%, 47% 100%, 53% 84%, 45% 66%, 56% 45%, 47% 24%)";

function SealBody({ initial }: { initial?: string }) {
  return (
    <>
      <span
        className="absolute inset-0"
        style={{
          borderRadius: "58% 42% 55% 45% / 45% 58% 42% 55%",
          background: "color-mix(in srgb, var(--os-primary) 78%, #000)",
          boxShadow: "0 3px 5px rgb(0 0 0 / 0.28)",
        }}
      />
      <span
        className="absolute inset-[7%] grid place-items-center"
        style={{
          borderRadius: "47% 53% 49% 51% / 53% 46% 54% 47%",
          background:
            "radial-gradient(circle at 32% 28%, color-mix(in srgb, var(--os-primary) 45%, #fff) 0 7%, var(--os-primary) 42%, color-mix(in srgb, var(--os-primary) 60%, #000) 100%)",
          boxShadow: "inset 0 -3px 5px rgb(0 0 0 / 0.22), inset 0 2px 3px rgb(255 255 255 / 0.3)",
        }}
      >
        <span
          className="grid size-[70%] place-items-center rounded-full"
          style={{
            border: "2px solid color-mix(in srgb, var(--os-primary) 62%, #000)",
            boxShadow: "inset 0 1px 2px rgb(0 0 0 / 0.3), 0 1px 0 rgb(255 255 255 / 0.3)",
            color: "color-mix(in srgb, var(--os-primary) 50%, #000)",
            textShadow: "0 1px 0 rgb(255 255 255 / 0.35)",
          }}
        >
          {initial ? (
            <span className="os-display leading-none font-semibold">{initial}</span>
          ) : (
            <Heart className="size-[55%] fill-current" strokeWidth={0} aria-hidden />
          )}
        </span>
      </span>
    </>
  );
}

/** A wax seal in the accent color. `cracked` splits it in two (a letter that can be opened). */
export function WaxSeal({ initial, cracked = false, size = "md" }: { initial?: string; cracked?: boolean; size?: keyof typeof SEAL_SIZES }) {
  return (
    <span aria-hidden className={`pointer-events-none relative block ${SEAL_SIZES[size]}`}>
      {cracked ? (
        <>
          <span
            className="absolute inset-0 transition-transform duration-500 [transform:translate(-1px,1px)_rotate(-6deg)] group-hover:[transform:translate(-4px,3px)_rotate(-13deg)] group-focus-visible:[transform:translate(-4px,3px)_rotate(-13deg)]"
            style={{ clipPath: LEFT_HALF }}
          >
            <SealBody initial={initial} />
          </span>
          <span
            className="absolute inset-0 transition-transform duration-500 [transform:translate(2px,-1px)_rotate(5deg)] group-hover:[transform:translate(5px,-2px)_rotate(11deg)] group-focus-visible:[transform:translate(5px,-2px)_rotate(11deg)]"
            style={{ clipPath: RIGHT_HALF }}
          >
            <SealBody initial={initial} />
          </span>
        </>
      ) : (
        <SealBody initial={initial} />
      )}
    </span>
  );
}

// Postmark and stamps --------------------------------------------------------------------

/** A rubber-stamped postmark with wavy cancellation lines. Use on paper. */
export function Postmark({
  label,
  children,
  tilt = -4,
  className = "",
}: {
  label: ReactNode;
  children: ReactNode;
  tilt?: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 ${className}`} style={{ color: STAMP_INK }}>
      <span className="os-stamp max-w-full text-center leading-tight" style={{ "--tilt": `${tilt}deg` } as CSSProperties}>
        <span className="flex items-center justify-center gap-1 text-[0.62rem] tracking-[0.18em] opacity-80">{label}</span>
        <span className="block text-[0.74rem]">{children}</span>
      </span>
      <svg aria-hidden viewBox="0 0 40 22" className="pointer-events-none h-5 w-9 shrink-0 opacity-60" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M1 4c5-3 8 3 13 0s8-3 13 0 8 3 12 0" />
        <path d="M1 11c5-3 8 3 13 0s8-3 13 0 8 3 12 0" />
        <path d="M1 18c5-3 8 3 13 0s8-3 13 0 8 3 12 0" />
      </svg>
    </span>
  );
}

/** A perforated postage stamp. Decorative. */
export function PostageStamp({ className = "", children }: { className?: string; children?: ReactNode }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none block rotate-[5deg] p-[5px] drop-shadow-[0_3px_4px_rgb(40_25_10/0.25)] ${className}`}
      style={{ background: "radial-gradient(circle, transparent 2.6px, #fffdf8 3px) -5px -5px / 10px 10px" }}
    >
      <span
        className="grid h-[3.4rem] w-[2.9rem] place-items-center border border-[#3b2f2a]/10 sm:h-[4.4rem] sm:w-[3.7rem]"
        style={{
          background:
            "linear-gradient(160deg, color-mix(in srgb, var(--os-primary) 38%, #fdf3e6), color-mix(in srgb, var(--os-primary) 16%, #fdf3e6))",
          color: STAMP_INK,
        }}
      >
        {children ?? <Heart className="size-5 fill-current sm:size-6" strokeWidth={0} />}
      </span>
    </span>
  );
}

// Envelopes ------------------------------------------------------------------------------

function EnvelopeFolds() {
  return (
    <svg aria-hidden viewBox="0 0 140 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full rounded-[6px]">
      <path d="M0 2 L61 53 M140 2 L79 53" fill="none" stroke="rgb(110 80 50 / 0.14)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <path
        d="M0 100 L63 54 Q70 49 77 54 L140 100 Z"
        fill="rgb(255 255 255 / 0.4)"
        stroke="rgb(110 80 50 / 0.2)"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export type EnvelopeState = "sealed" | "unopened" | "opened";

/**
 * The back of an envelope. `sealed`: flap closed with an intact wax seal.
 * `unopened`: the seal is cracked and the flap lifts a little (more on hover).
 * `opened`: the flap is folded up and the letter peeks out.
 * Children are written on the envelope (dark ink is inherited).
 */
export function Envelope({
  state,
  initial,
  size = "md",
  className = "",
  children,
}: {
  state: EnvelopeState;
  initial?: string;
  size?: "md" | "lg";
  className?: string;
  children?: ReactNode;
}) {
  const opened = state === "opened";
  const lg = size === "lg";
  return (
    <div className={`relative text-[#3b2f2a] ${className}`}>
      {opened ? (
        <div aria-hidden className="pointer-events-none relative aspect-[10/3]">
          <div className="absolute inset-0" style={{ clipPath: UP_TRIANGLE, background: LINER }} />
          <div
            className="absolute inset-x-[9%] top-[40%] h-[260%] rounded-[3px] bg-[#fffdf8] shadow-[0_-1px_4px_rgb(40_25_10/0.14)] transition-[translate] duration-500 group-hover:-translate-y-2 group-focus-visible:-translate-y-2"
            style={{
              rotate: "-1.5deg",
              backgroundImage: "repeating-linear-gradient(transparent 0 10px, rgb(90 130 190 / 0.25) 10px 11px)",
              backgroundPosition: "0 14px",
            }}
          />
        </div>
      ) : null}

      <div className="relative z-10 flex aspect-[7/5] flex-col rounded-[6px]" style={{ background: ENVELOPE_PAPER, boxShadow: ENVELOPE_SHADOW }}>
        <EnvelopeFolds />

        {!opened ? (
          <>
            {/* The inside, seen when the flap lifts. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 aspect-[10/3]"
              style={{ clipPath: DOWN_TRIANGLE, background: "linear-gradient(to bottom, #c9b28b, #eadcc2)" }}
            />
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-x-0 top-0 aspect-[10/3] origin-top drop-shadow-[0_2px_2px_rgb(40_25_10/0.18)] transition-transform duration-500 ease-[cubic-bezier(0.34,1.4,0.64,1)] ${
                state === "unopened"
                  ? "[transform:perspective(600px)_rotateX(42deg)] group-hover:[transform:perspective(600px)_rotateX(60deg)] group-focus-visible:[transform:perspective(600px)_rotateX(60deg)]"
                  : ""
              }`}
            >
              <div className="absolute inset-0" style={{ clipPath: DOWN_TRIANGLE, background: FLAP_PAPER }} />
              <span
                className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 ${
                  state === "sealed" ? "group-hover:animate-[os-wiggle_0.6s_ease-in-out]" : ""
                }`}
              >
                <WaxSeal initial={initial} cracked={state === "unopened"} size={lg ? "lg" : "md"} />
              </span>
            </div>
          </>
        ) : null}

        <div
          className={`relative flex flex-1 flex-col items-center justify-center gap-1 px-5 pb-5 text-center ${
            opened ? "pt-6" : lg ? "pt-[calc(30%+3rem)]" : "pt-[calc(30%+2.25rem)]"
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * The opened envelope a letter was drawn out of. The flap starts closed and
 * swings open (os-flap-open, from <LetterMotion />). Decorative.
 */
export function OpenedEnvelope({ initial, className = "" }: { initial?: string; className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none ${className}`}>
      <div className="relative z-10 aspect-[10/3]">
        <div
          className="absolute inset-0 origin-bottom"
          style={{ transformStyle: "preserve-3d", animation: "os-flap-open 0.9s var(--os-ease-out) 0.2s both" }}
        >
          {/* Inside of the flap, facing us once it's open. */}
          <div className="absolute inset-0" style={{ clipPath: UP_TRIANGLE, background: LINER, ...HIDE_BACKFACE }} />
          {/* Outside of the flap with the seal, facing us while it's closed. */}
          <div className="absolute inset-0" style={{ transform: "rotateX(180deg)", ...HIDE_BACKFACE }}>
            <div className="absolute inset-0" style={{ clipPath: DOWN_TRIANGLE, background: FLAP_PAPER }} />
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
              <WaxSeal initial={initial} />
            </span>
          </div>
        </div>
      </div>
      <div className="relative aspect-[10/7] rounded-[6px]" style={{ background: ENVELOPE_PAPER, boxShadow: ENVELOPE_SHADOW }}>
        <EnvelopeFolds />
      </div>
    </div>
  );
}

/** A tiny envelope icon for lists. */
export function MiniEnvelope({ state }: { state: "sealed" | "delivered" | "read" }) {
  const edge = "rgb(110 80 50 / 0.4)";
  return (
    <svg aria-hidden viewBox="0 0 56 48" className="pointer-events-none h-11 w-[3.25rem] shrink-0 drop-shadow-[0_3px_4px_rgb(40_25_10/0.2)]">
      {state === "read" ? (
        <>
          <path d="M3 22 L28 5 L53 22 Z" fill="#ead8b8" stroke={edge} strokeWidth="1" strokeLinejoin="round" />
          <rect x="10" y="9" width="36" height="26" rx="1.5" fill="#fffdf8" stroke="rgb(110 80 50 / 0.25)" strokeWidth="1" />
          <path d="M15 16h24M15 21h19" stroke="rgb(90 130 190 / 0.55)" strokeWidth="1.3" strokeLinecap="round" />
          <rect x="3" y="22" width="50" height="23" rx="2.5" fill="#f6ead6" stroke={edge} strokeWidth="1" />
          <path d="M3.5 44 L28 30 L52.5 44" fill="none" stroke={edge} strokeWidth="1" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <rect x="3" y="12" width="50" height="33" rx="2.5" fill="#f6ead6" stroke={edge} strokeWidth="1" />
          <path d="M3.5 13 L28 32 L52.5 13" fill="#efe0c4" stroke={edge} strokeWidth="1" strokeLinejoin="round" />
          {state === "sealed" ? <circle cx="28" cy="31" r="5.5" style={{ fill: "var(--os-primary)" }} stroke="rgb(0 0 0 / 0.25)" strokeWidth="1" /> : null}
        </>
      )}
    </svg>
  );
}
