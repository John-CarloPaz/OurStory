import type { CSSProperties } from "react";

/**
 * Tenant themes. Each couple's couple_themes row is turned into CSS custom
 * properties on the workspace wrapper; every component reads those tokens, so
 * nothing about a couple's look is hard-coded.
 */

export const THEME_PRESET_NAMES = ["paper", "linen", "blush", "sage", "midnight"] as const;
export const CARD_STYLES = ["soft", "flat", "outlined", "elevated"] as const;
export const TYPOGRAPHY_OPTIONS = ["editorial", "modern", "classic", "handwritten"] as const;
export const BACKGROUND_STYLES = ["plain", "paper", "grain", "gradient"] as const;
export const LAYOUTS = ["comfortable", "compact"] as const;

export type ThemePresetName = (typeof THEME_PRESET_NAMES)[number];
export type CardStyle = (typeof CARD_STYLES)[number];
export type Typography = (typeof TYPOGRAPHY_OPTIONS)[number];
export type BackgroundStyle = (typeof BACKGROUND_STYLES)[number];
export type Layout = (typeof LAYOUTS)[number];

export type ThemeSettings = {
  name: ThemePresetName;
  primary_color: string;
  background_color: string;
  card_style: CardStyle;
  typography: Typography;
  background_style: BackgroundStyle;
  layout: Layout;
};

export const THEME_PRESETS: Record<ThemePresetName, { label: string; primary: string; background: string }> = {
  paper: { label: "Paper", primary: "#b4553d", background: "#f6f0e6" },
  linen: { label: "Linen", primary: "#5e6b52", background: "#f3efe8" },
  blush: { label: "Blush", primary: "#b64f6f", background: "#fbf0f1" },
  sage: { label: "Sage", primary: "#4f7a61", background: "#eef2ea" },
  midnight: { label: "Midnight", primary: "#e3a857", background: "#161925" },
};

export const DEFAULT_THEME: ThemeSettings = {
  name: "paper",
  primary_color: THEME_PRESETS.paper.primary,
  background_color: THEME_PRESETS.paper.background,
  card_style: "soft",
  typography: "editorial",
  background_style: "paper",
  layout: "comfortable",
};

export const TYPOGRAPHY_LABELS: Record<Typography, string> = {
  editorial: "Editorial",
  modern: "Modern",
  classic: "Classic",
  handwritten: "Handwritten",
};

// Color math -------------------------------------------------------------------

type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb {
  const value = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.slice(1) : "000000";
  return [0, 2, 4].map((i) => Number.parseInt(value.slice(i, i + 2), 16)) as Rgb;
}

function rgbToHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, "0")).join("")}`;
}

function mix(a: string, b: string, amount: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * amount) as Rgb);
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function isDark(hex: string): boolean {
  return luminance(hex) < 0.2;
}

/** Nudges `color` toward the ink until it reaches `ratio` against `background`. */
function ensureContrast(color: string, background: string, ink: string, ratio: number): string {
  let result = color;
  for (let step = 0; step < 10 && contrastRatio(result, background) < ratio; step++) {
    result = mix(result, ink, 0.2);
  }
  return result;
}

// Activity colors ------------------------------------------------------------------

/**
 * Calendar activity colors. Fixed, not tenant-themed, so a color always means
 * the same kind of activity. Picked from the validated categorical palette as
 * the only 4-hue set that passes the all-pairs checks (every pair can appear
 * in one day cell) in both light and dark mode; dark steps are used on dark
 * themes. Dark-mode CVD separation is in the warn band, so identity is never
 * color alone: each kind has a fixed dot position, a labeled legend, and
 * labeled, icon-marked sections in the day panel.
 */
export const ACTIVITY_KINDS = ["plans", "stories", "milestones", "photos"] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const ACTIVITY_COLORS: Record<ActivityKind, { light: string; dark: string }> = {
  plans: { light: "#2a78d6", dark: "#3987e5" },
  stories: { light: "#eda100", dark: "#c98500" },
  milestones: { light: "#e87ba4", dark: "#d55181" },
  photos: { light: "#008300", dark: "#008300" },
};

// CSS variables ------------------------------------------------------------------

const FONT_STACKS: Record<Typography, { display: string; body: string }> = {
  editorial: { display: "var(--font-fraunces)", body: "var(--font-newsreader)" },
  modern: { display: "var(--font-inter)", body: "var(--font-inter)" },
  classic: { display: "var(--font-cormorant)", body: "var(--font-newsreader)" },
  handwritten: { display: "var(--font-caveat)", body: "var(--font-newsreader)" },
};

export function themeVariables(theme: ThemeSettings): CSSProperties {
  const bg = theme.background_color;
  const dark = isDark(bg);
  const ink = dark ? "#f4efe6" : "#2a211d";
  const muted = mix(ink, bg, 0.42);
  const primary = ensureContrast(theme.primary_color, bg, ink, 3);
  const primaryInk = contrastRatio("#ffffff", primary) >= 3.5 ? "#ffffff" : "#1d1714";

  const cardBase = dark ? mix(bg, "#ffffff", 0.06) : mix(bg, "#ffffff", 0.62);
  const cards: Record<CardStyle, { bg: string; border: string; shadow: string }> = {
    soft: {
      bg: cardBase,
      border: mix(bg, ink, 0.08),
      shadow: dark ? "0 1px 2px rgb(0 0 0 / 0.3)" : "0 1px 2px rgb(60 40 20 / 0.04), 0 8px 24px -12px rgb(60 40 20 / 0.12)",
    },
    flat: { bg: mix(bg, ink, dark ? 0.06 : 0.035), border: "transparent", shadow: "none" },
    outlined: { bg: "transparent", border: mix(bg, ink, 0.2), shadow: "none" },
    elevated: {
      bg: dark ? mix(bg, "#ffffff", 0.09) : "#ffffff",
      border: "transparent",
      shadow: dark ? "0 12px 32px -8px rgb(0 0 0 / 0.6)" : "0 2px 4px rgb(60 40 20 / 0.05), 0 18px 40px -16px rgb(60 40 20 / 0.25)",
    },
  };
  const card = cards[theme.card_style];
  const fonts = FONT_STACKS[theme.typography];

  return {
    "--os-bg": bg,
    "--os-ink": ink,
    "--os-muted": muted,
    "--os-line": mix(bg, ink, dark ? 0.16 : 0.12),
    "--os-primary": primary,
    "--os-primary-ink": primaryInk,
    "--os-primary-soft": mix(bg, primary, dark ? 0.22 : 0.12),
    "--os-card": card.bg,
    "--os-card-border": card.border,
    "--os-card-shadow": card.shadow,
    "--os-field": dark ? mix(bg, "#ffffff", 0.08) : mix(bg, "#ffffff", 0.75),
    "--os-font-display": fonts.display,
    "--os-font-body": fonts.body,
    "--os-display-scale": theme.typography === "handwritten" ? "1.25" : "1",
    "--os-activity-plans": ACTIVITY_COLORS.plans[dark ? "dark" : "light"],
    "--os-activity-stories": ACTIVITY_COLORS.stories[dark ? "dark" : "light"],
    "--os-activity-milestones": ACTIVITY_COLORS.milestones[dark ? "dark" : "light"],
    "--os-activity-photos": ACTIVITY_COLORS.photos[dark ? "dark" : "light"],
    "--os-gap": theme.layout === "compact" ? "0.75rem" : "1.25rem",
    "--os-section-gap": theme.layout === "compact" ? "1.75rem" : "2.75rem",
    colorScheme: dark ? "dark" : "light",
  } as CSSProperties;
}

export function backgroundClass(style: BackgroundStyle): string {
  return `os-bg-${style}`;
}

function pick<T extends string>(allowed: readonly T[], value: string | null | undefined, fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/** Narrows a couple_themes row to ThemeSettings, falling back to defaults for anything unexpected. */
export function toThemeSettings(row: Partial<Record<keyof ThemeSettings, string | null>> | null | undefined): ThemeSettings {
  const hex = (value: string | null | undefined, fallback: string) => (value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback);
  return {
    name: pick(THEME_PRESET_NAMES, row?.name, DEFAULT_THEME.name),
    primary_color: hex(row?.primary_color, DEFAULT_THEME.primary_color),
    background_color: hex(row?.background_color, DEFAULT_THEME.background_color),
    card_style: pick(CARD_STYLES, row?.card_style, DEFAULT_THEME.card_style),
    typography: pick(TYPOGRAPHY_OPTIONS, row?.typography, DEFAULT_THEME.typography),
    background_style: pick(BACKGROUND_STYLES, row?.background_style, DEFAULT_THEME.background_style),
    layout: pick(LAYOUTS, row?.layout, DEFAULT_THEME.layout),
  };
}
