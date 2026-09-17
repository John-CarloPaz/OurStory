import type { CSSProperties, ReactNode } from "react";

/**
 * Scrapbook materials used across the app (the scrapbook editor has its own,
 * resizable versions). Presentational only.
 */

export type TapePattern = "solid" | "stripes" | "dots" | "grid" | "checks";

export function Tape({
  className = "",
  color,
  pattern = "stripes",
  rotate = -4,
  style,
}: {
  className?: string;
  color?: string;
  pattern?: TapePattern;
  rotate?: number;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden
      data-pattern={pattern}
      className={`os-tape pointer-events-none ${className}`}
      style={{ ...(color ? { "--tape": color } : {}), transform: `rotate(${rotate}deg)`, ...style } as CSSProperties}
    />
  );
}

export function Polaroid({
  src,
  alt = "",
  caption,
  tilt = 0,
  className = "",
  imageClassName = "aspect-square",
  priority = false,
  children,
}: {
  src: string | null;
  alt?: string;
  caption?: ReactNode;
  tilt?: number;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  children?: ReactNode;
}) {
  return (
    <figure className={`os-polaroid relative ${className}`} style={{ "--tilt": `${tilt}deg` } as CSSProperties}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed private URL
        <img
          src={src}
          alt={alt}
          loading={priority ? undefined : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
          className={`w-full rounded-[2px] bg-[#efe7da] object-cover ${imageClassName}`}
        />
      ) : (
        <div className={`w-full rounded-[2px] bg-[linear-gradient(135deg,#f3e6d6,#e8d5c4)] ${imageClassName}`} />
      )}
      {caption ? (
        <figcaption className="os-hand absolute inset-x-2 bottom-1.5 truncate text-center text-xl leading-tight text-[#4a3b33]">{caption}</figcaption>
      ) : null}
      {children}
    </figure>
  );
}

export function StickyNote({
  children,
  color = "#fff1a8",
  tilt = -2,
  className = "",
}: {
  children: ReactNode;
  color?: string;
  tilt?: number;
  className?: string;
}) {
  return (
    <div className={`os-sticky ${className}`} style={{ "--note": color, "--tilt": `${tilt}deg` } as CSSProperties}>
      {children}
    </div>
  );
}

export function Stamp({ children, className = "", tilt = -6 }: { children: ReactNode; className?: string; tilt?: number }) {
  return (
    <span className={`os-stamp text-accent ${className}`} style={{ "--tilt": `${tilt}deg` } as CSSProperties}>
      {children}
    </span>
  );
}

/** Hand-drawn accents. */
export function Doodle({
  kind,
  className = "",
}: {
  kind: "heart" | "star" | "sparkle" | "squiggle" | "arrow" | "underline" | "circle";
  className?: string;
}) {
  const stretch = kind === "underline" || kind === "squiggle";
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stretch ? 2.5 : 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    // Wide, short lines should stretch to their box without the stroke getting distorted.
    ...(stretch ? { vectorEffect: "non-scaling-stroke" as const } : {}),
  };
  const paths: Record<typeof kind, ReactNode> = {
    heart: <path {...common} d="M24 40c-9-6-17-12-17-21 0-5 4-9 9-9 4 0 6 2 8 5 2-3 4-5 8-5 5 0 9 4 9 9 0 9-8 15-17 21Z" />,
    star: <path {...common} d="m24 6 5 12 13 1-10 8 3 13-11-7-11 7 3-13L6 19l13-1Z" />,
    sparkle: <path {...common} d="M24 6c1 10 4 15 14 18-10 3-13 8-14 18-1-10-4-15-14-18 10-3 13-8 14-18Z" />,
    squiggle: <path {...common} d="M4 30c6-10 10-10 14 0s8 10 14 0 10-10 12 0" />,
    arrow: <path {...common} d="M6 34c10-2 22-10 30-24m0 0-9 1m9-1 1 9" />,
    underline: <path {...common} d="M4 30c12-5 28-6 40-2" />,
    circle: <path {...common} d="M24 8c11 0 18 7 17 16-1 10-9 16-19 15C11 38 5 31 7 22 9 13 17 8 27 9" />,
  };
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={className} preserveAspectRatio={stretch ? "none" : undefined}>
      {paths[kind]}
    </svg>
  );
}
