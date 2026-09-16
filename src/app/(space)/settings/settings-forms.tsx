"use client";

import { useState } from "react";
import { cancelInvitationAction, invitePartner, resendInvitationAction, type InvitationFormState } from "@/app/actions/invitations";
import { deleteSpace, updateCoupleIdentity, updateProfile, updateTheme } from "@/app/actions/spaces";
import { InvitationDeliveryNotice } from "@/components/invitation-delivery-notice";
import { Field, FormMessage, Input, SubmitButton, Textarea } from "@/components/ui/form";
import { useFormAction } from "@/components/ui/use-form-action";
import { IDLE } from "@/lib/forms";
import {
  BACKGROUND_STYLES,
  CARD_STYLES,
  LAYOUTS,
  THEME_PRESET_NAMES,
  THEME_PRESETS,
  TYPOGRAPHY_LABELS,
  TYPOGRAPHY_OPTIONS,
  backgroundClass,
  themeVariables,
  type ThemeSettings,
} from "@/lib/theme";

const INVITE_IDLE: InvitationFormState = { status: "idle" };

export function IdentityForm({
  couple,
}: {
  couple: { name: string | null; displayTitle: string; description: string | null; storyBeganOn: string | null };
}) {
  const { state, pending, formProps } = useFormAction(updateCoupleIdentity, IDLE);
  return (
    <form {...formProps} className="os-card space-y-5 p-6">
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
        <Input name="storyBeganOn" type="date" defaultValue={couple.storyBeganOn ?? ""} state={state} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pending={pending} pendingText="Saving…">Save</SubmitButton>
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
      <SubmitButton size="sm" pending={pending} pendingText="Saving…">
        Save profile
      </SubmitButton>
    </form>
  );
}

function OptionGroup<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  label,
}: {
  legend: string;
  name: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  label: (value: T) => string;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option} className="cursor-pointer">
            <input type="radio" name={name} value={option} checked={value === option} onChange={() => onChange(option)} className="peer sr-only" />
            <span className="inline-flex rounded-full border border-line px-3.5 py-1.5 text-sm text-muted capitalize transition peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:text-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
              {label(option)}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ThemeForm({ theme }: { theme: ThemeSettings }) {
  const { state, pending, formProps } = useFormAction(updateTheme, IDLE);
  const [draft, setDraft] = useState<ThemeSettings>(theme);
  const set = <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => setDraft((d) => ({ ...d, [key]: value }));

  return (
    <form {...formProps} className="os-card grid gap-8 p-6 xl:grid-cols-[1fr_18rem]">
      <div className="space-y-6">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">Theme</legend>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {THEME_PRESET_NAMES.map((preset) => (
              <label key={preset} className="cursor-pointer">
                <input
                  type="radio"
                  name="name"
                  value={preset}
                  checked={draft.name === preset}
                  onChange={() =>
                    setDraft((d) => ({
                      ...d,
                      name: preset,
                      primary_color: THEME_PRESETS[preset].primary,
                      background_color: THEME_PRESETS[preset].background,
                    }))
                  }
                  className="peer sr-only"
                />
                <span className="block rounded-xl border border-line p-2 text-center text-xs text-muted transition peer-checked:border-accent peer-checked:text-ink peer-checked:ring-2 peer-checked:ring-accent/30 peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                  <span className="mb-2 flex h-10 overflow-hidden rounded-lg border border-black/5" style={{ background: THEME_PRESETS[preset].background }}>
                    <span className="m-auto size-4 rounded-full" style={{ background: THEME_PRESETS[preset].primary }} />
                  </span>
                  {THEME_PRESETS[preset].label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-4">
          <label className="space-y-1.5 text-sm font-medium text-ink">
            <span className="block">Accent color</span>
            <span className="flex items-center gap-2 rounded-xl border border-line bg-field p-1.5 pr-3">
              <input type="color" name="primaryColor" value={draft.primary_color} onChange={(e) => set("primary_color", e.target.value)} className="h-8 w-10 cursor-pointer rounded-lg border-0 bg-transparent" />
              <span className="font-mono text-xs text-muted uppercase">{draft.primary_color}</span>
            </span>
          </label>
          <label className="space-y-1.5 text-sm font-medium text-ink">
            <span className="block">Background</span>
            <span className="flex items-center gap-2 rounded-xl border border-line bg-field p-1.5 pr-3">
              <input type="color" name="backgroundColor" value={draft.background_color} onChange={(e) => set("background_color", e.target.value)} className="h-8 w-10 cursor-pointer rounded-lg border-0 bg-transparent" />
              <span className="font-mono text-xs text-muted uppercase">{draft.background_color}</span>
            </span>
          </label>
        </div>

        <OptionGroup legend="Typography" name="typography" options={TYPOGRAPHY_OPTIONS} value={draft.typography} onChange={(v) => set("typography", v)} label={(v) => TYPOGRAPHY_LABELS[v]} />
        <OptionGroup legend="Cards" name="cardStyle" options={CARD_STYLES} value={draft.card_style} onChange={(v) => set("card_style", v)} label={(v) => v} />
        <OptionGroup legend="Background" name="backgroundStyle" options={BACKGROUND_STYLES} value={draft.background_style} onChange={(v) => set("background_style", v)} label={(v) => v} />
        <OptionGroup legend="Layout" name="layout" options={LAYOUTS} value={draft.layout} onChange={(v) => set("layout", v)} label={(v) => v} />

        <FormMessage state={state} />
        <SubmitButton pending={pending} pendingText="Saving…">Save appearance</SubmitButton>
      </div>

      <div aria-label="Preview" className="xl:sticky xl:top-24 xl:self-start">
        <p className="mb-2 text-sm font-medium text-ink">Preview</p>
        <div style={themeVariables(draft)} className={`${backgroundClass(draft.background_style)} overflow-hidden rounded-2xl border border-line p-4 text-ink`}>
          <p className="os-eyebrow">Our Little World</p>
          <p className="os-display mt-1 text-3xl leading-tight text-ink">You ♡ Them</p>
          <div className="os-card mt-4 p-4">
            <p className="text-xs text-muted">September 14</p>
            <p className="os-display text-lg leading-snug text-ink">The night we met</p>
            <p className="mt-1 text-sm text-muted" style={{ fontFamily: "var(--font-body)" }}>
              It rained the whole way home and neither of us minded.
            </p>
          </div>
          <span className="mt-4 inline-flex h-9 items-center rounded-full bg-accent px-4 text-sm font-medium text-on-accent">Write an entry</span>
        </div>
      </div>
    </form>
  );
}

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
          <SubmitButton variant="secondary" size="sm" pending={resendPending} pendingText="Sending…">
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
          <SubmitButton variant="danger" size="sm" pending={cancelPending} pendingText="Cancelling…">
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
    <form {...formProps} className="rounded-[1.25rem] border border-danger/30 p-6">
      <p className="text-sm leading-relaxed text-ink">
        Your journals, photos, letters, places and everything else in this space will no longer be available to either of you. Type{" "}
        <strong className="font-mono">{phrase}</strong> to confirm.
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
