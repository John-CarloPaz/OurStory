import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "text-on-accent bg-[linear-gradient(135deg,var(--os-primary),color-mix(in_srgb,var(--os-primary)_68%,#ff9f7a))] " +
    "shadow-[0_1px_0_rgb(255_255_255/0.35)_inset,0_12px_28px_-14px_color-mix(in_srgb,var(--os-primary)_85%,transparent)] " +
    "hover:-translate-y-0.5 hover:shadow-[0_1px_0_rgb(255_255_255/0.35)_inset,0_18px_34px_-14px_color-mix(in_srgb,var(--os-primary)_90%,transparent)]",
  secondary: "os-glass text-ink hover:-translate-y-0.5 hover:border-accent/50",
  ghost: "text-ink hover:bg-accent-soft",
  danger: "text-danger border border-danger/30 hover:bg-danger/10",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5",
  md: "h-11 px-5 text-[0.9375rem] gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className = "") {
  return [
    "relative inline-flex items-center justify-center rounded-full font-medium whitespace-nowrap select-none",
    "transition duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)] active:translate-y-0 active:scale-[0.97]",
    "disabled:opacity-60 disabled:pointer-events-none",
    VARIANTS[variant],
    SIZES[size],
    className,
  ].join(" ");
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
