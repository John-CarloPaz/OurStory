"use client";

import { Heart } from "lucide-react";
import type { CSSProperties } from "react";
import { createSpace } from "@/app/actions/spaces";
import { Doodle, Stamp, Tape } from "@/components/decor/materials";
import { SvgStickerArt } from "@/components/scrapbook/stickers";
import type { SvgSticker } from "@/lib/scrapbook/model";
import { LinkButton } from "@/components/ui/button";
import { Field, FormMessage, Input, SubmitButton } from "@/components/ui/form";
import { InvitationDeliveryNotice } from "@/components/invitation-delivery-notice";
import { useFormAction } from "@/components/ui/use-form-action";
import type { InvitationFormState } from "@/app/actions/invitations";

const IDLE: InvitationFormState = { status: "idle" };

/** Faint ruled lines, like the first page of a notebook. */
const RULED: CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(transparent 0 2.2rem, color-mix(in srgb, var(--os-primary) 11%, transparent) 2.2rem 2.25rem)",
  maskImage: "linear-gradient(#000 35%, transparent)",
  WebkitMaskImage: "linear-gradient(#000 35%, transparent)",
};

export function CreateSpaceForm({ defaultName }: { defaultName: string }) {
  const { state, pending, formProps } = useFormAction(createSpace, IDLE);

  if (state.status === "success" && state.outcome) {
    const { outcome } = state;
    return (
      <div className="os-page-enter relative">
        <Tape className="absolute -top-3 left-1/2 z-20 -translate-x-1/2" rotate={-3} pattern="dots" color="#f6b8c2" />
        <div className="os-card relative overflow-hidden px-6 pt-8 pb-9 text-center sm:px-10 sm:pb-10">
          <Celebration />
          <p aria-hidden className="os-pop os-hand text-2xl text-accent [animation-delay:650ms]">
            here&apos;s to page one
          </p>
          <h1 className="os-display mt-1 text-4xl leading-tight font-medium text-ink sm:text-5xl">Your space is ready.</h1>
          <InvitationDeliveryNotice outcome={outcome} />
          <LinkButton href="/home" size="lg" className="mt-8">
            Go To Our Story
          </LinkButton>
        </div>
      </div>
    );
  }

  return (
    <div className="os-page-enter relative">
      <Tape className="absolute -top-2 -left-3 z-20 sm:-left-7" rotate={-36} pattern="stripes" color="#f6b8c2" />
      <Tape className="absolute -top-2 -right-3 z-20 sm:-right-7" rotate={36} pattern="dots" color="#b5d8f0" />
      <div className="os-card relative overflow-hidden px-6 pt-12 pb-8 sm:px-10 sm:pb-10">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-56 opacity-70" style={RULED} />
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <p className="os-eyebrow flex items-center gap-1.5">
              <Doodle kind="sparkle" className="size-3.5" />
              Page one
            </p>
            <Stamp tilt={7} className="-mt-3 hidden shrink-0 text-[0.7rem] sm:inline-grid">
              Nº 001
            </Stamp>
          </div>
          <h1 className="os-display mt-3 text-4xl leading-[1.05] font-medium text-ink sm:text-5xl">Create Your Space</h1>
          <p aria-hidden className="os-hand mt-2 inline-flex -rotate-1 items-center gap-1 text-2xl text-accent">
            where your story starts <Doodle kind="heart" className="size-5" />
          </p>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
            A private place for the two of you. You can change all of this later.
          </p>

          <form {...formProps} className="mt-8 space-y-5">
            <Field label="Your name" name="creatorName" state={state}>
              <Input name="creatorName" defaultValue={defaultName} required maxLength={60} autoComplete="given-name" state={state} />
            </Field>
            <Field label="Your partner's email" name="partnerEmail" state={state} hint="We'll send them a private invitation.">
              <Input name="partnerEmail" type="email" required autoComplete="off" placeholder="partner@example.com" state={state} />
            </Field>
            <Field label="Relationship name" name="coupleName" state={state} optional>
              <Input name="coupleName" maxLength={80} placeholder="Leave blank to use both your names" state={state} />
            </Field>
            <Field label="When did your story begin?" name="storyBeganOn" state={state} optional>
              <Input name="storyBeganOn" type="date" state={state} />
            </Field>
            <FormMessage state={state} />
            <SubmitButton pending={pending} className="w-full" size="lg" pendingText="Creating your space…">
              Create Our Space
            </SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}

const CONFETTI: { sticker: SvgSticker; className: string; delay: number; tilt: number }[] = [
  { sticker: "heart", className: "top-1 left-[8%] w-12", delay: 180, tilt: -12 },
  { sticker: "star", className: "top-0 right-[10%] w-11", delay: 300, tilt: 10 },
  { sticker: "xoxo", className: "bottom-2 left-0 w-16", delay: 420, tilt: -8 },
  { sticker: "flower", className: "right-[2%] bottom-1 w-12", delay: 540, tilt: 8 },
];

/** Stickers and hearts that pop in around a big heart. Settles instantly under reduced motion. */
function Celebration() {
  return (
    <div aria-hidden className="pointer-events-none relative mx-auto mb-3 h-36 w-full max-w-[17rem] select-none">
      {[0, 1, 2].map((i) => (
        <Heart
          key={i}
          className="absolute top-1/2 size-4 fill-current text-accent/60"
          style={{
            left: `${38 + i * 12}%`,
            animation: `os-heart-rise 2.6s ease-out ${900 + i * 450}ms 2 both`,
          }}
        />
      ))}

      <div className="os-pop absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ "--pop-rotate": "-18deg" } as CSSProperties}>
        <div className="grid size-20 -rotate-6 place-items-center rounded-[1.6rem] bg-accent-soft text-accent shadow-[0_18px_40px_-18px_color-mix(in_srgb,var(--os-primary)_70%,transparent)]">
          <Heart className="size-9 fill-current" />
        </div>
      </div>

      {CONFETTI.map(({ sticker, className, delay, tilt }, index) => (
        <div key={sticker} className={`os-pop absolute ${className}`} style={{ animationDelay: `${delay}ms` }}>
          <div className="os-float" style={{ animationDelay: `${-index * 1.3}s` }}>
            <div className="os-sticker" style={{ rotate: `${tilt}deg` }}>
              <SvgStickerArt id={sticker} />
            </div>
          </div>
        </div>
      ))}

      <Doodle kind="sparkle" className="os-pop absolute top-[18%] left-[30%] size-5 text-accent [animation-delay:620ms]" />
      <Doodle kind="sparkle" className="os-pop absolute right-[28%] bottom-[14%] size-4 text-accent/70 [animation-delay:720ms]" />
    </div>
  );
}
