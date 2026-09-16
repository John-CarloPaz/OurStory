import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:brightness-[1.06] active:brightness-95 shadow-sm",
  secondary: "bg-card text-ink border border-line hover:border-accent/60",
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
    "inline-flex items-center justify-center rounded-full font-medium whitespace-nowrap transition",
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
