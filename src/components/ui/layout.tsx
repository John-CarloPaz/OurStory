import type { ReactNode } from "react";

export function Card({ children, className = "", as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" | "article" | "li" }) {
  return <Tag className={`os-card ${className}`}>{children}</Tag>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 space-y-2">
        {eyebrow ? <p className="os-eyebrow">{eyebrow}</p> : null}
        <h1 className="os-display text-4xl leading-[1.05] font-medium text-ink sm:text-5xl">{title}</h1>
        {description ? <p className="max-w-2xl text-[0.9375rem] leading-relaxed text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <h2 className="os-display text-2xl font-medium text-ink">{children}</h2>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="os-card flex flex-col items-center px-6 py-12 text-center">
      {icon ? <div className="mb-4 grid size-12 place-items-center rounded-full bg-accent-soft text-accent">{icon}</div> : null}
      <h3 className="os-display text-2xl text-ink">{title}</h3>
      {children ? <p className="mt-2 max-w-md text-[0.9375rem] leading-relaxed text-muted">{children}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        tone === "accent" ? "bg-accent-soft text-accent" : "border border-line text-muted"
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
    <img src={src} alt={name} width={size} height={size} decoding="async" className="shrink-0 rounded-full object-cover ring-2 ring-canvas" style={{ width: size, height: size }} />
  ) : (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full bg-accent-soft font-medium text-accent ring-2 ring-canvas"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials || "♡"}
    </span>
  );
}
