import type { CSSProperties } from "react";
import { PlaceIcon } from "@/components/content-meta";

/**
 * Postcard materials: stamps and postmarks. Paper keeps dark ink in every
 * theme; stamp ink is tinted with the couple's accent. Presentational only.
 */

export const POSTMARK_INK = "color-mix(in srgb, var(--os-primary) 42%, #3b2f2a)";

const STAMP_COLORS: Record<string, string> = {
  home: "#f3c4b5",
  food: "#f5d59f",
  travel: "#b9d5ee",
  nature: "#c3dfbb",
  culture: "#d9caef",
  nightlife: "#c3c8e6",
  other: "#ecd5c3",
};

/** A perforated postage stamp showing the place's category icon. Decorative. */
export function PostageStamp({ category, size = "md", className = "" }: { category: string; size?: "sm" | "md"; className?: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none block rotate-[4deg] p-[5px] drop-shadow-[0_2px_3px_rgb(40_25_10/0.25)] ${className}`}
      style={{ background: "radial-gradient(circle, transparent 2.6px, #fdf8ef 3px) -5px -5px / 10px 10px" }}
    >
      <span
        className={`grid place-items-center text-[#3b2f2a]/80 ${size === "sm" ? "h-12 w-10" : "h-[4.1rem] w-[3.5rem]"}`}
        style={{ background: STAMP_COLORS[category] ?? STAMP_COLORS.other, boxShadow: "inset 0 0 0 3px rgb(255 255 255 / 0.45)" }}
      >
        <PlaceIcon category={category} className={size === "sm" ? "size-5" : "size-6"} />
      </span>
    </span>
  );
}

/** A round "since" postmark. Its text is real content (read aloud); only the rings are decoration. */
export function SincePostmark({ since, className = "" }: { since: string; className?: string }) {
  return (
    <span
      className={`relative grid size-[4.5rem] shrink-0 -rotate-12 content-center place-items-center rounded-full border-2 text-center font-typewriter leading-tight uppercase mix-blend-multiply ${className}`}
      style={{ color: POSTMARK_INK, borderColor: "currentColor", boxShadow: "inset 0 0 0 3px #fdf8ef, inset 0 0 0 4px currentColor" } as CSSProperties}
    >
      <span className="block text-[0.55rem] tracking-[0.2em]">Since</span>
      <span className="block text-[0.7rem]">{since}</span>
    </span>
  );
}

/** Wavy cancellation lines. Decorative. */
export function CancelLines({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 56 24"
      className={`pointer-events-none mix-blend-multiply ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      style={{ color: POSTMARK_INK }}
    >
      <path d="M1 5c6-4 10 4 16 0s10-4 16 0 10 4 16 0 5-2 6-1" />
      <path d="M1 12c6-4 10 4 16 0s10-4 16 0 10 4 16 0 5-2 6-1" />
      <path d="M1 19c6-4 10 4 16 0s10-4 16 0 10 4 16 0 5-2 6-1" />
    </svg>
  );
}
