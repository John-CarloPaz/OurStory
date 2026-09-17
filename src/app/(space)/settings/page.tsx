import { HeartHandshake, ImagePlus, Mail, Palette, TriangleAlert, UsersRound, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import { removeAvatar, removeCover } from "@/app/actions/uploads";
import { Doodle, Tape } from "@/components/decor/materials";
import { ImageUpload } from "@/components/image-upload";
import { Avatar, PageHeader } from "@/components/ui/layout";
import { currentTimeMs, formatCalendarDate, formatInstant } from "@/lib/dates";
import { signMediaUrls } from "@/lib/storage/media";
import { requireActiveSpace } from "@/lib/tenant";
import { getViewerTimeZone } from "@/lib/timezone";
import { toThemeSettings } from "@/lib/theme";
import { DeleteSpaceForm, IdentityForm, InvitePartnerForm, PendingInvitationActions, ProfileForm, ThemeForm } from "./settings-forms";

export const metadata: Metadata = { title: "Settings" };

const SECTIONS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "identity", label: "Identity", icon: HeartHandshake },
  { id: "profiles", label: "Profiles", icon: UsersRound },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "invitation", label: "Invitation", icon: Mail },
  { id: "danger", label: "Delete space", icon: TriangleAlert },
];

/** An inner panel inside a section card. */
const panel = "rounded-2xl border border-line bg-field/40";

function Section({
  id,
  title,
  description,
  icon: Icon,
  tone = "default",
  children,
}: {
  id: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  tone?: "default" | "danger";
  children: React.ReactNode;
}) {
  const danger = tone === "danger";
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`os-card scroll-mt-24 p-5 sm:p-8 ${danger ? "border-danger/30" : ""}`}>
      <header className="mb-6 flex items-start gap-4 sm:mb-7">
        <span
          aria-hidden
          className={`grid size-11 shrink-0 -rotate-6 place-items-center rounded-2xl shadow-sm ${danger ? "bg-danger/10 text-danger" : "bg-accent-soft text-accent"}`}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="os-display text-2xl leading-tight font-medium text-ink sm:text-3xl">
            {title}
          </h2>
          {description ? <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p> : null}
        </div>
      </header>
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  const space = await requireActiveSpace();
  const tz = await getViewerTimeZone();
  const { couple, me, partner, pendingInvitation } = space;
  const urls = await signMediaUrls(space, [couple.cover_path, ...space.members.map((m) => m.avatarPath)]);

  return (
    <div className="space-y-8 sm:space-y-10">
      <PageHeader eyebrow="Settings" title="Make it yours" note="our little corner" description="Everything here belongs to this space only." />

      <nav aria-label="Settings sections" className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:overflow-visible sm:px-0">
        <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="os-glass inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium text-ink transition hover:-translate-y-0.5 hover:border-accent/50"
              >
                <Icon className={`size-4 ${id === "danger" ? "text-danger" : "text-accent"}`} aria-hidden />
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-6 sm:space-y-8">
        <Section id="identity" title="Couple identity" description="How your space introduces you two." icon={HeartHandshake}>
          <div className="space-y-7">
            <div className="relative pt-2">
              <Tape className="absolute top-0 left-6 z-10" rotate={-5} />
              <Tape className="absolute top-0 right-6 z-10" rotate={4} pattern="dots" color="#b5d8f0" />
              <div className={`${panel} overflow-hidden`}>
                {couple.cover_path && urls[couple.cover_path] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- signed private URL
                  <img src={urls[couple.cover_path]} alt="Cover" decoding="async" className="aspect-[3/1] w-full bg-accent-soft object-cover" />
                ) : (
                  <div
                    className="grid aspect-[3/1] min-h-28 place-items-center bg-accent-soft text-sm text-muted"
                    style={{
                      backgroundImage: "radial-gradient(color-mix(in srgb, var(--os-primary) 18%, transparent) 1px, transparent 1.5px)",
                      backgroundSize: "14px 14px",
                    }}
                  >
                    <span className="flex flex-col items-center gap-1.5">
                      <ImagePlus className="size-6 text-accent" aria-hidden />
                      No cover photo yet
                    </span>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3 border-t border-line p-3 sm:px-4">
                  <ImageUpload target={{ kind: "cover" }} label={couple.cover_path ? "Change cover" : "Add cover photo"} />
                  {couple.cover_path ? (
                    <form action={removeCover}>
                      <button type="submit" className="inline-flex h-10 items-center rounded-full px-3 text-sm text-muted transition hover:bg-danger/10 hover:text-danger">
                        Remove
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            </div>
            <IdentityForm
              couple={{
                name: couple.name,
                displayTitle: couple.display_title,
                description: couple.description,
                storyBeganOn: couple.story_began_on,
              }}
            />
          </div>
        </Section>

        <Section id="profiles" title="Partner profiles" description="You can edit your own profile. Your partner edits theirs." icon={UsersRound}>
          <div className="grid gap-[var(--os-gap)] md:grid-cols-2">
            <div className={`${panel} space-y-5 p-5 sm:p-6`}>
              <p className="os-eyebrow">You</p>
              <div className="flex flex-wrap items-center gap-4">
                <Avatar name={me.displayName} src={me.avatarPath ? urls[me.avatarPath] : null} size={64} />
                <div className="space-y-1">
                  <ImageUpload target={{ kind: "avatar" }} label={me.avatarPath ? "Change photo" : "Add photo"} />
                  {me.avatarPath ? (
                    <form action={removeAvatar}>
                      <button type="submit" className="inline-flex h-10 items-center rounded-full px-3 text-sm text-muted transition hover:bg-danger/10 hover:text-danger">
                        Remove photo
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
              <ProfileForm profile={{ displayName: me.displayName, birthday: me.birthday }} />
            </div>

            {partner ? (
              <div className={`${panel} space-y-5 p-5 sm:p-6`}>
                <p className="os-eyebrow">Your partner</p>
                <div className="flex items-center gap-4">
                  <Avatar name={partner.displayName} src={partner.avatarPath ? urls[partner.avatarPath] : null} size={64} />
                  <div className="min-w-0">
                    <p className="os-display text-2xl break-words text-ink">{partner.displayName}</p>
                    <p className="text-sm text-muted">Joined {formatInstant(partner.joinedAt, tz, { dateStyle: "long" })}</p>
                  </div>
                </div>
                <dl className="text-sm">
                  <dt className="text-muted">Birthday</dt>
                  <dd className="text-ink">{partner.birthday ? formatCalendarDate(partner.birthday, { month: "long", day: "numeric" }) : "Not added yet"}</dd>
                </dl>
              </div>
            ) : (
              <div className="relative flex min-h-56 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-line p-6 text-center">
                <Doodle kind="heart" className="os-float absolute top-5 right-6 size-8 text-accent/25" />
                <Doodle kind="sparkle" className="os-float absolute bottom-6 left-6 size-6 text-accent/20 [animation-delay:-2s]" />
                <p className="os-display text-2xl text-ink">Your partner&apos;s spot</p>
                <p className="mt-2 text-sm text-muted">Their profile appears here once they join.</p>
              </div>
            )}
          </div>
        </Section>

        <Section id="appearance" title="Appearance" description="Theme, colors, typography and layout. Both of you see the same look." icon={Palette}>
          <ThemeForm theme={toThemeSettings(space.theme)} />
        </Section>

        <Section id="invitation" title="Invitation" description="A space is for exactly two people." icon={Mail}>
          {partner ? (
            <div className={`${panel} flex items-center gap-4 p-5`}>
              <Avatar name={partner.displayName} src={partner.avatarPath ? urls[partner.avatarPath] : null} size={44} />
              <div className="min-w-0">
                <p className="text-ink">
                  <span className="font-medium">{partner.displayName}</span> is your partner in this space.
                </p>
                <p className="text-sm text-muted">Joined {formatInstant(partner.joinedAt, tz, { dateStyle: "long" })}. This space is full.</p>
              </div>
            </div>
          ) : pendingInvitation ? (
            <div className={`${panel} space-y-4 p-5 sm:p-6`}>
              <div>
                <p className="os-eyebrow">
                  {Date.parse(pendingInvitation.expires_at) <= currentTimeMs() ? "Invitation expired" : "Invitation pending"}
                </p>
                <p className="os-display mt-2 text-2xl break-all text-ink">{pendingInvitation.invited_email}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  Invited {formatInstant(pendingInvitation.created_at, tz, { dateStyle: "long" })} · last sent{" "}
                  {formatInstant(pendingInvitation.last_sent_at, tz, { dateStyle: "medium", timeStyle: "short" })} ·{" "}
                  {Date.parse(pendingInvitation.expires_at) <= currentTimeMs() ? "expired" : "expires"}{" "}
                  {formatInstant(pendingInvitation.expires_at, tz, { dateStyle: "long" })}
                </p>
              </div>
              <PendingInvitationActions invitationId={pendingInvitation.id} />
              <details className="text-sm">
                <summary className="inline-flex min-h-10 cursor-pointer items-center text-muted underline-offset-4 hover:text-ink hover:underline">
                  Invite a different email instead
                </summary>
                <div className="mt-3">
                  <InvitePartnerForm />
                </div>
              </details>
            </div>
          ) : (
            <div className={`${panel} space-y-4 p-5 sm:p-6`}>
              <p className="text-ink">No one has been invited yet.</p>
              <InvitePartnerForm />
            </div>
          )}
        </Section>

        <Section
          id="danger"
          title="Delete this space"
          description="Removes the space for both of you. Other spaces are not affected."
          icon={TriangleAlert}
          tone="danger"
        >
          <DeleteSpaceForm />
        </Section>
      </div>
    </div>
  );
}
