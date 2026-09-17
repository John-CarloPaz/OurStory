"use client";

import { Check } from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";
import { cancelInvitationAction, invitePartner, resendInvitationAction, type InvitationFormState } from "@/app/actions/invitations";
import { deleteSpace, updateCoupleIdentity, updateProfile, updateTheme } from "@/app/actions/spaces";
import { InvitationDeliveryNotice } from "@/components/invitation-delivery-notice";
import { Field, FormMessage, Input, SubmitButton, Textarea } from "@/components/ui/form";
import { useFormAction } from "@/components/ui/use-form-action";
import { IDLE } from "@/lib/forms";
import {
  BACKGROUND_STYLES,
  BACKGROUND_STYLE_LABELS,
  CARD_STYLES,
  CARD_STYLE_LABELS,
  LAYOUTS,
  THEME_PRESET_NAMES,
  THEME_PRESETS,
  TYPOGRAPHY_LABELS,
  TYPOGRAPHY_OPTIONS,
  isDark,
  themeVariables,
  type BackgroundStyle,
  type CardStyle,
  type Layout,
  type ThemeSettings,
  type Typography,
} from "@/lib/theme";

const INVITE_IDLE: InvitationFormState = { status: "idle" };

export function IdentityForm({
  couple,
}: {
  couple: { name: string | null; displayTitle: string; description: string | null; storyBeganOn: string | null };
}) {
  const { state, pending, formProps } = useFormAction(updateCoupleIdentity, IDLE);
  return (
    <form {...formProps} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Couple name" name="name" state={state} optional hint="Leave blank to show both your names.">
          <Input name="name" maxLength={80} defaultValue={couple.name ?? ""} state={state} />
        </Field>
        <Field label="Display title" name="displayTitle" state={state}>
          <Input name="displayTitle" required maxLength={80} defaultValue={couple.displayTitle} state={state} />
        </Field>
      </div>
      <Field label="Description" name="description" state={state} optional>
        <Textarea name="description" rows={2} maxLength={500} defaultValue={couple.description ?? ""} state={state} />
      </Field>
      <Field label="When your story began" name="storyBeganOn" state={state} optional>
        <Input name="storyBeganOn" type="date" defaultValue={couple.storyBeganOn ?? ""} state={state} className="sm:max-w-xs" />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pending={pending} pendingText="Saving…">
        Save
      </SubmitButton>
    </form>
  );
}

export function ProfileForm({ profile }: { profile: { displayName: string; birthday: string | null } }) {
  const { state, pending, formProps } = useFormAction(updateProfile, IDLE);
  return (
    <form {...formProps} className="space-y-5">
      <Field label="Name" name="displayName" state={state}>
        <Input name="displayName" required maxLength={60} defaultValue={profile.displayName} state={state} />
      </Field>
      <Field label="Birthday" name="birthday" state={state} optional>
        <Input name="birthday" type="date" defaultValue={profile.birthday ?? ""} state={state} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pending={pending} pendingText="Saving…">
        Save profile
      </SubmitButton>
    </form>
  );
}

// Appearance ---------------------------------------------------------------------------

const TYPE_FACES: Record<Typography, string> = {
  editorial: "var(--font-fraunces), Georgia, serif",
  modern: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
  classic: "var(--font-cormorant), Georgia, serif",
  handwritten: "var(--font-caveat), 'Segoe Print', cursive",
};

const LAYOUT_LABELS: Record<Layout, string> = { comfortable: "Comfortable", compact: "Compact" };

const NOISE = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5 0 0 0 0 0.45 0 0 0 0 0.4 0 0 0 1 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>",
)}")`;

const mixToken = (token: string, amount: number) => `color-mix(in srgb, var(${token}) ${amount}%, transparent)`;

/**
 * The page backgrounds (the .os-bg-* classes and AmbientBackground) redrawn at
 * preview scale. The real ones are position: fixed, so they can't live in a box.
 * Reads the --os-* variables of the element it is applied to.
 */
function backdrop(style: BackgroundStyle): CSSProperties {
  switch (style) {
    case "aurora":
      return {
        background:
          "radial-gradient(62% 72% at 8% 4%, var(--os-blob-1), transparent 72%), " +
          "radial-gradient(56% 66% at 100% 42%, var(--os-blob-2), transparent 72%), " +
          "radial-gradient(66% 62% at 34% 108%, var(--os-blob-3), transparent 72%), var(--os-bg)",
      };
    case "retro":
      return {
        background:
          `radial-gradient(${mixToken("--os-primary", 24)} 1px, transparent 1.6px) 0 0 / 10px 10px, ` +
          `radial-gradient(120% 80% at 50% -10%, ${mixToken("--os-primary", 16)}, transparent 60%), var(--os-bg)`,
      };
    case "paper":
      return {
        background:
          `radial-gradient(110% 70% at 10% -10%, ${mixToken("--os-primary", 11)}, transparent 70%), ` +
          `radial-gradient(90% 60% at 100% 0%, ${mixToken("--os-ink", 7)}, transparent 70%), var(--os-bg)`,
      };
    case "gradient":
      return { background: "linear-gradient(170deg, var(--os-blob-2) 0%, var(--os-bg) 42%, var(--os-blob-3) 120%), var(--os-bg)" };
    case "grain":
    case "plain":
      return { background: "var(--os-bg)" };
  }
}

/** Film grain, slightly stronger than the page's so it reads at thumbnail size. */
function Grain({ dark }: { dark: boolean }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{ backgroundImage: NOISE, backgroundSize: "140px 140px", opacity: dark ? 0.22 : 0.18, mixBlendMode: dark ? "soft-light" : "multiply" }}
    />
  );
}

const TILE =
  "block h-full space-y-1.5 rounded-2xl border border-line bg-field/40 p-1.5 text-xs font-medium text-muted transition duration-200 " +
  "hover:border-accent/50 peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:text-ink " +
  "peer-checked:shadow-[0_0_0_3px_color-mix(in_srgb,var(--os-primary)_22%,transparent)] " +
  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent";

/** A radio group whose options are small visual previews. */
function OptionTiles<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  label,
  swatch,
  className,
}: {
  legend: string;
  name: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  label: (value: T) => string;
  swatch: (value: T) => ReactNode;
  className: string;
}) {
  return (
    <fieldset>
      <legend className="mb-2.5 text-sm font-medium text-ink">{legend}</legend>
      <div className={`grid gap-2.5 ${className}`}>
        {options.map((option) => (
          <label key={option} className="relative block cursor-pointer">
            <input type="radio" name={name} value={option} checked={value === option} onChange={() => onChange(option)} className="peer sr-only" />
            <span className={TILE}>
              {swatch(option)}
              <span className="block truncate px-1 pb-0.5 text-center">{label(option)}</span>
            </span>
            <span
              aria-hidden
              className="absolute -top-1.5 -right-1.5 hidden size-5 place-items-center rounded-full bg-accent text-on-accent shadow-sm peer-checked:grid"
            >
              <Check className="size-3" strokeWidth={3} />
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ColorField({ label, name, value, onChange }: { label: string; name: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block min-w-0 cursor-pointer rounded-2xl border border-line bg-field/40 p-1.5 pr-3 transition hover:border-accent/50 focus-within:border-accent">
      <span className="flex items-center gap-2.5">
        <input
          type="color"
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-10 shrink-0 cursor-pointer rounded-xl border-0 bg-transparent p-0 [&::-moz-color-swatch]:rounded-xl [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-xl [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
        />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-ink">{label}</span>
          <span className="block font-mono text-xs text-muted uppercase">{value}</span>
        </span>
      </span>
    </label>
  );
}

function ThemePreview({ draft, unsaved }: { draft: ThemeSettings; unsaved: boolean }) {
  const dark = isDark(draft.background_color);
  return (
    <>
      <p className="mb-2 flex min-h-7 items-center justify-between gap-2 text-sm font-medium text-ink">
        Preview
        {unsaved ? <span className="os-hand os-pop text-lg leading-none text-accent">not saved yet</span> : null}
      </p>
      <div
        style={{ ...themeVariables(draft), ...backdrop(draft.background_style) }}
        className="relative isolate overflow-hidden rounded-[1.4rem] border border-line text-ink shadow-[0_24px_50px_-32px_rgb(0_0_0/0.5)]"
      >
        {draft.background_style !== "plain" ? <Grain dark={dark} /> : null}
        <div className="os-stack relative p-4 sm:p-5">
          <div>
            <p className="os-eyebrow">Our Little World</p>
            <p className="os-display mt-1 text-3xl leading-tight text-ink">You ♡ Them</p>
          </div>
          <div className="relative">
            {/* Sits behind the card so glass shows as frosted, other styles as solid. */}
            <span aria-hidden className="absolute -top-3 right-6 size-12 rounded-full bg-accent" />
            <span aria-hidden className="absolute -bottom-2 left-4 h-5 w-16 -rotate-6 rounded-full bg-[var(--os-blob-3)]" />
            <div className="os-card relative p-4">
              <p className="text-xs text-muted">September 14</p>
              <p className="os-display text-lg leading-snug text-ink">The night we met</p>
              <p className="mt-1 text-sm text-muted" style={{ fontFamily: "var(--os-font-body), ui-serif, Georgia, serif" }}>
                It rained the whole way home and neither of us minded.
              </p>
            </div>
          </div>
          <div className="flex items-end justify-between gap-3">
            <span className="inline-flex h-9 items-center rounded-full bg-accent px-4 text-sm font-medium text-on-accent">Write an entry</span>
            <span aria-hidden className="os-polaroid relative block w-14 shrink-0 p-1 pb-4" style={{ "--tilt": "7deg" } as CSSProperties}>
              <span className="block aspect-square w-full rounded-[2px] bg-[linear-gradient(160deg,#ffc49e,#f7a0a6_50%,#b28ddb)]" />
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

function sameTheme(a: ThemeSettings, b: ThemeSettings) {
  return (Object.keys(a) as (keyof ThemeSettings)[]).every((key) => a[key].toLowerCase() === b[key].toLowerCase());
}

export function ThemeForm({ theme }: { theme: ThemeSettings }) {
  const { state, pending, formProps } = useFormAction(updateTheme, IDLE);
  const [draft, setDraft] = useState<ThemeSettings>(theme);
  const set = <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const vars = themeVariables(draft);
  const dark = isDark(draft.background_color);

  return (
    <form {...formProps} className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-8">
      <div className="min-w-0 space-y-7">
        <OptionTiles
          legend="Theme"
          name="name"
          options={THEME_PRESET_NAMES}
          value={draft.name}
          onChange={(preset) =>
            setDraft((d) => ({
              ...d,
              name: preset,
              primary_color: THEME_PRESETS[preset].primary,
              background_color: THEME_PRESETS[preset].background,
            }))
          }
          label={(preset) => THEME_PRESETS[preset].label}
          className="grid-cols-3 sm:grid-cols-5"
          swatch={(preset) => {
            const { primary, background } = THEME_PRESETS[preset];
            const ink = isDark(background) ? "rgb(255 255 255 / 0.45)" : "rgb(40 30 25 / 0.2)";
            return (
              <span
                className="relative block h-12 overflow-hidden rounded-xl border border-black/5"
                style={{ background: `radial-gradient(90% 110% at 0% 0%, color-mix(in srgb, ${primary} 32%, transparent), transparent 70%), ${background}` }}
              >
                <span className="absolute top-2.5 left-2.5 block h-1.5 w-8 rounded-full" style={{ background: ink }} />
                <span className="absolute top-5 left-2.5 block h-1.5 w-5 rounded-full" style={{ background: ink }} />
                <span className="absolute right-2 bottom-2 block size-4 rounded-full ring-2 ring-white/50" style={{ background: primary }} />
              </span>
            );
          }}
        />

        <fieldset>
          <legend className="mb-2.5 text-sm font-medium text-ink">Colors</legend>
          <div className="grid grid-cols-2 gap-2.5">
            <ColorField label="Accent color" name="primaryColor" value={draft.primary_color} onChange={(v) => set("primary_color", v)} />
            <ColorField label="Background" name="backgroundColor" value={draft.background_color} onChange={(v) => set("background_color", v)} />
          </div>
        </fieldset>

        <OptionTiles
          legend="Typography"
          name="typography"
          options={TYPOGRAPHY_OPTIONS}
          value={draft.typography}
          onChange={(v) => set("typography", v)}
          label={(v) => TYPOGRAPHY_LABELS[v]}
          className="grid-cols-2 sm:grid-cols-4"
          swatch={(v) => (
            <span
              className="grid h-12 place-items-center rounded-xl bg-ink/5 leading-none text-ink"
              style={{ fontFamily: TYPE_FACES[v], fontSize: v === "handwritten" ? "1.9rem" : "1.5rem" }}
            >
              Aa
            </span>
          )}
        />

        <OptionTiles
          legend="Cards"
          name="cardStyle"
          options={CARD_STYLES}
          value={draft.card_style}
          onChange={(v) => set("card_style", v)}
          label={(v) => CARD_STYLE_LABELS[v]}
          className="grid-cols-3 sm:grid-cols-5"
          swatch={(v: CardStyle) => (
            <span
              className="relative block h-12 overflow-hidden rounded-xl border border-black/5"
              style={{ ...themeVariables({ ...draft, card_style: v }), ...backdrop(draft.background_style) }}
            >
              <span className="absolute top-1 right-2 block size-5 rounded-full bg-accent" />
              <span className="os-card absolute inset-x-2.5 top-3 bottom-2 block rounded-lg px-2 py-1.5">
                <span className="block h-1.5 w-6 rounded-full bg-accent/70" />
                <span className="mt-1 block h-1.5 w-9 max-w-full rounded-full bg-ink/25" />
              </span>
            </span>
          )}
        />

        <OptionTiles
          legend="Background"
          name="backgroundStyle"
          options={BACKGROUND_STYLES}
          value={draft.background_style}
          onChange={(v) => set("background_style", v)}
          label={(v) => BACKGROUND_STYLE_LABELS[v]}
          className="grid-cols-3 sm:grid-cols-6"
          swatch={(v) => (
            <span className="relative block h-12 overflow-hidden rounded-xl border border-black/5" style={{ ...vars, ...backdrop(v) }}>
              {v !== "plain" ? <Grain dark={dark} /> : null}
            </span>
          )}
        />

        <OptionTiles
          legend="Layout"
          name="layout"
          options={LAYOUTS}
          value={draft.layout}
          onChange={(v) => set("layout", v)}
          label={(v) => LAYOUT_LABELS[v]}
          className="max-w-sm grid-cols-2"
          swatch={(v) => (
            <span className="flex h-12 flex-col justify-center rounded-xl bg-ink/5 px-3" style={{ gap: v === "compact" ? 3 : 7 }}>
              {[78, 54, 66].map((width) => (
                <span key={width} className="block h-1.5 rounded-full bg-ink/20" style={{ width: `${width}%` }} />
              ))}
            </span>
          )}
        />

        <div className="space-y-4 border-t border-dashed border-line pt-6">
          <FormMessage state={state} />
          <SubmitButton pending={pending} pendingText="Saving…">
            Save appearance
          </SubmitButton>
        </div>
      </div>

      <div aria-label="Preview" className="order-first lg:sticky lg:top-24 lg:order-none lg:self-start">
        <ThemePreview draft={draft} unsaved={!sameTheme(draft, theme)} />
      </div>
    </form>
  );
}

// Invitations and deletion --------------------------------------------------------------

export function InvitePartnerForm() {
  const { state, pending, formProps } = useFormAction(invitePartner, INVITE_IDLE);

  if (state.status === "success" && state.outcome) {
    return <InvitationDeliveryNotice outcome={state.outcome} />;
  }

  return (
    <form {...formProps} className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-1">
          <Field label="Partner's email" name="email" state={state}>
            <Input name="email" type="email" required placeholder="partner@example.com" state={state} />
          </Field>
        </div>
        <SubmitButton pending={pending} className="sm:mt-7" pendingText="Sending…">
          Send invitation
        </SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function PendingInvitationActions({ invitationId }: { invitationId: string }) {
  const { state: resendState, pending: resendPending, formProps: resendForm } = useFormAction(resendInvitationAction, INVITE_IDLE);
  const { state: cancelState, pending: cancelPending, formProps: cancelForm } = useFormAction(cancelInvitationAction, IDLE);
  const { ref: cancelRef, onSubmit: submitCancel } = cancelForm;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <form {...resendForm}>
          <input type="hidden" name="invitationId" value={invitationId} />
          <SubmitButton variant="secondary" pending={resendPending} pendingText="Sending…">
            Resend Invitation
          </SubmitButton>
        </form>
        <form
          ref={cancelRef}
          onSubmit={(event) => {
            if (window.confirm("Cancel this invitation? The link in their email will stop working.")) submitCancel(event);
            else event.preventDefault();
          }}
        >
          <input type="hidden" name="invitationId" value={invitationId} />
          <SubmitButton variant="danger" pending={cancelPending} pendingText="Cancelling…">
            Cancel Invitation
          </SubmitButton>
        </form>
      </div>
      <FormMessage state={resendState} />
      {resendState.status === "success" && resendState.outcome && !resendState.outcome.delivered ? (
        <InvitationDeliveryNotice outcome={resendState.outcome} />
      ) : null}
      <FormMessage state={cancelState} />
    </div>
  );
}

export function DeleteSpaceForm() {
  const { state, pending, formProps } = useFormAction(deleteSpace, IDLE);
  const [confirmation, setConfirmation] = useState("");
  const phrase = "DELETE OUR SPACE";

  return (
    <form {...formProps} className="rounded-2xl bg-danger/5 p-5 sm:p-6">
      <p className="text-sm leading-relaxed text-ink">
        Your journals, photos, letters, places and everything else in this space will no longer be available to either of you. Type{" "}
        <strong className="font-mono break-words">{phrase}</strong> to confirm.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Input name="confirmation" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="off" aria-label="Confirmation phrase" className="sm:max-w-xs" />
        <SubmitButton variant="danger" pending={pending} disabled={confirmation !== phrase} pendingText="Deleting…">
          Delete this space
        </SubmitButton>
      </div>
      <div className="mt-3">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
