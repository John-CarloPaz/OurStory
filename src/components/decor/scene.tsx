import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Doodle, Tape } from "@/components/decor/materials";
import { SvgStickerArt } from "@/components/scrapbook/stickers";
import { APP_NAME } from "@/lib/env";

/**
 * Shared presentation for the public, signed-out screens (auth, onboarding,
 * invitations). Purely decorative apart from the brand link.
 */

/** A soft "photo" painted with gradients, so no image is ever fetched. */
export const PHOTO_SCENES = {
  sunset:
    "radial-gradient(circle at 68% 42%, #fff6cf 0 9%, rgb(255 246 207 / 0) 9.5%), " +
    "radial-gradient(90% 38% at 22% 104%, #7b5c9f 0 97%, rgb(123 92 159 / 0) 100%), " +
    "radial-gradient(85% 34% at 88% 108%, #604a88 0 97%, rgb(96 74 136 / 0) 100%), " +
    "linear-gradient(180deg, #ffc49e 0%, #f7a0a6 48%, #b28ddb 100%)",
  ocean:
    "radial-gradient(circle at 26% 30%, #fffbe6 0 8%, rgb(255 251 230 / 0) 8.5%), " +
    "linear-gradient(180deg, transparent 0 56%, #7cc4d4 56% 66%, #4f9fb8 66% 78%, #f1d9ad 78%), " +
    "linear-gradient(180deg, #a9d8f2, #e6f4f1 56%)",
  night:
    "radial-gradient(circle at 76% 22%, #fff8e1 0 7%, rgb(255 248 225 / 0) 7.5%), " +
    "radial-gradient(circle at 22% 62%, rgb(255 206 120 / 0.9) 0 5%, rgb(255 206 120 / 0) 12%), " +
    "radial-gradient(circle at 56% 50%, rgb(255 160 150 / 0.8) 0 6%, rgb(255 160 150 / 0) 14%), " +
    "radial-gradient(circle at 82% 72%, rgb(255 225 160 / 0.85) 0 4%, rgb(255 225 160 / 0) 10%), " +
    "radial-gradient(circle at 40% 84%, rgb(190 170 255 / 0.7) 0 5%, rgb(190 170 255 / 0) 12%), " +
    "linear-gradient(160deg, #2f2b54, #4b3a6e 55%, #6b4a74)",
  meadow:
    "radial-gradient(circle at 30% 38%, #ffd6e0 0 9%, rgb(255 214 224 / 0) 10%), " +
    "radial-gradient(circle at 64% 58%, #ffe9b8 0 8%, rgb(255 233 184 / 0) 9%), " +
    "radial-gradient(circle at 44% 78%, #ffc2d1 0 7%, rgb(255 194 209 / 0) 8%), " +
    "radial-gradient(circle at 80% 30%, #fff 0 5%, rgb(255 255 255 / 0) 6%), " +
    "linear-gradient(150deg, #cfe4b8, #8fbf98 70%, #6fa487)",
} as const;

export type PhotoScene = keyof typeof PHOTO_SCENES;

/** A polaroid holding a painted scene. Paper material: light paper, dark ink. */
export function ScenePolaroid({
  scene,
  caption,
  tilt = 0,
  className = "",
  captionClassName = "text-lg",
  children,
}: {
  scene: PhotoScene;
  caption?: string;
  tilt?: number;
  className?: string;
  captionClassName?: string;
  children?: ReactNode;
}) {
  return (
    <figure className={`os-polaroid relative ${className}`} style={{ "--tilt": `${tilt}deg` } as CSSProperties}>
      <div className="aspect-square w-full rounded-[2px]" style={{ background: PHOTO_SCENES[scene] }} />
      {caption ? (
        <figcaption className={`os-hand absolute inset-x-2 bottom-1 truncate text-center leading-tight text-[#4a3b33] ${captionClassName}`}>
          {caption}
        </figcaption>
      ) : null}
      {children}
    </figure>
  );
}

/** App name with a hand-drawn heart. Pass margin and text size through `className`. */
export function BrandMark({ href, className = "" }: { href: string; className?: string }) {
  return (
    <Link
      href={href}
      className={`group os-display flex min-h-11 w-fit items-center gap-2.5 rounded-full px-3 text-ink ${className}`}
    >
      <span
        aria-hidden
        className="relative grid size-9 place-items-center rounded-full bg-accent-soft text-accent shadow-sm transition duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-rotate-12 group-hover:scale-110"
      >
        <Doodle kind="heart" className="size-6" />
        <Doodle kind="sparkle" className="absolute -top-1.5 -right-1.5 size-3.5" />
      </span>
      {APP_NAME}
    </Link>
  );
}

/** A polaroid and a sticker peeking out from behind the auth card (sm and up). */
export function AuthBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden select-none sm:block">
      <div className="os-pop absolute -top-16 -right-20 w-36 [animation-delay:180ms]">
        <div className="os-float [animation-duration:8s]">
          <ScenePolaroid scene="sunset" caption="us ♡" tilt={9}>
            <Tape className="absolute -top-3 left-1/2 w-16 -translate-x-1/2" rotate={-7} pattern="dots" color="#f6b8c2" />
          </ScenePolaroid>
        </div>
      </div>
      <div className="os-pop absolute -bottom-7 -left-10 w-16 [animation-delay:320ms]">
        <div className="os-float os-sticker [animation-delay:-3s] [animation-duration:7s]">
          <SvgStickerArt id="star" />
        </div>
      </div>
    </div>
  );
}

/** The glass card every auth screen sits on. */
export function AuthCard({
  title,
  note,
  description,
  icon,
  center = false,
  children,
}: {
  title: ReactNode;
  /** A short handwritten aside above the title. */
  note?: string;
  description?: ReactNode;
  icon?: ReactNode;
  center?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={`os-card os-page-enter relative px-6 pt-10 pb-8 sm:px-10 sm:pb-10 ${center ? "text-center" : ""}`}>
      <Tape className="absolute -top-3 left-1/2 -translate-x-1/2" rotate={-3} />
      {icon}
      {note ? (
        <p aria-hidden className={`os-hand mb-1 inline-block -rotate-2 text-2xl leading-none text-accent ${center ? "" : "-ml-0.5"}`}>
          {note}
        </p>
      ) : null}
      <h1 className="os-display text-[2rem] leading-tight font-medium text-ink sm:text-4xl">{title}</h1>
      {description ? <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">{description}</p> : null}
      {children}
    </div>
  );
}

/** Classes for small text links in auth footers, sized as touch targets. */
export const authLinkClass = "inline-flex min-h-10 items-center font-medium text-accent underline-offset-4 hover:underline";
