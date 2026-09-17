import type { CSSProperties, ReactNode } from "react";
import { Doodle } from "@/components/decor/materials";

export function Card({
  children,
  className = "",
  as: Tag = "div",
  style,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
  style?: CSSProperties;
}) {
  return (
    <Tag className={`os-card ${className}`} style={style}>
      {children}
    </Tag>
  );
}

/** Fades and lifts children in as they scroll into view. `index` staggers siblings. */
export function Reveal({
  children,
  index = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  index?: number;
  className?: string;
  as?: "div" | "li" | "section" | "article";
}) {
  return (
    <Tag className={`os-reveal ${className}`} style={{ "--i": index } as CSSProperties}>
      {children}
    </Tag>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  note,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** A short handwritten aside next to the title. */
  note?: string;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-5">
      <div className="min-w-0 space-y-3">
        {eyebrow ? (
          <p className="os-eyebrow flex items-center gap-1.5">
            <Doodle kind="sparkle" className="size-3.5" />
            {eyebrow}
          </p>
        ) : null}
        <h1 className="os-display relative text-[2.5rem] leading-[1.02] font-medium text-ink sm:text-6xl">
          {title}
          {note ? (
            <span aria-hidden className="os-hand ml-3 inline-block -rotate-3 align-middle text-2xl text-accent sm:text-3xl">
              {note}
            </span>
          ) : null}
        </h1>
        {description ? <p className="max-w-2xl text-[0.95rem] leading-relaxed text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 className="os-display relative text-2xl font-medium text-ink sm:text-3xl">
        {children}
        <Doodle kind="underline" className="absolute -bottom-3 left-0 h-4 w-24 text-accent/60" />
      </h2>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="os-card relative flex flex-col items-center overflow-hidden px-6 py-14 text-center">
      <Doodle kind="heart" className="os-float absolute top-6 right-8 size-10 text-accent/25" />
      <Doodle kind="star" className="os-float absolute bottom-8 left-8 size-8 text-accent/20 [animation-delay:-2s]" />
      {icon ? (
        <div className="mb-5 grid size-14 -rotate-6 place-items-center rounded-2xl bg-accent-soft text-accent shadow-sm">{icon}</div>
      ) : null}
      <h3 className="os-display text-3xl text-ink">{title}</h3>
      {children ? <p className="mt-2 max-w-md text-[0.95rem] leading-relaxed text-muted">{children}</p> : null}
      {action ? <div className="mt-7">{action}</div> : null}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        tone === "accent" ? "bg-accent-soft text-accent" : "border border-[var(--os-glass-border)] bg-[var(--os-glass)] text-muted"
      }`}
    >
      {children}
    </span>
  );
}

export function Avatar({ name, src, size = 40 }: { name: string; src?: string | null; size?: number }) {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URLs from private storage
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      decoding="async"
      className="shrink-0 rounded-full object-cover shadow-sm ring-2 ring-white/80"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,var(--os-primary-soft),color-mix(in_srgb,var(--os-primary)_30%,var(--os-bg)))] font-semibold text-accent shadow-sm ring-2 ring-white/80"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials || "♡"}
    </span>
  );
}
