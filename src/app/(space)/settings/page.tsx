import type { Metadata } from "next";
import { removeAvatar, removeCover } from "@/app/actions/uploads";
import { ImageUpload } from "@/components/image-upload";
import { Avatar, Card, PageHeader } from "@/components/ui/layout";
import { currentTimeMs, formatCalendarDate, formatInstant } from "@/lib/dates";
import { signMediaUrls } from "@/lib/storage/media";
import { requireActiveSpace } from "@/lib/tenant";
import { getViewerTimeZone } from "@/lib/timezone";
import { toThemeSettings } from "@/lib/theme";
import { DeleteSpaceForm, IdentityForm, InvitePartnerForm, PendingInvitationActions, ProfileForm, ThemeForm } from "./settings-forms";

export const metadata: Metadata = { title: "Settings" };

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="grid scroll-mt-24 gap-6 border-t border-line pt-10 lg:grid-cols-[16rem_1fr]">
      <div>
        <h2 className="os-display text-2xl text-ink">{title}</h2>
        {description ? <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  const space = await requireActiveSpace();
  const tz = await getViewerTimeZone();
  const { couple, me, partner, pendingInvitation } = space;
  const urls = await signMediaUrls(space, [couple.cover_path, ...space.members.map((m) => m.avatarPath)]);

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Settings" title="Make it yours" description="Everything here belongs to this space only." />

      <Section id="identity" title="Couple identity" description="How your space introduces you two.">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            {couple.cover_path && urls[couple.cover_path] ? (
              // eslint-disable-next-line @next/next/no-img-element -- signed private URL
              <img src={urls[couple.cover_path]} alt="Cover" decoding="async" className="aspect-[3/1] w-full bg-accent-soft object-cover" />
            ) : (
              <div className="grid aspect-[3/1] place-items-center bg-accent-soft text-sm text-muted">No cover photo yet</div>
            )}
            <div className="flex flex-wrap items-center gap-3 p-4">
              <ImageUpload target={{ kind: "cover" }} label={couple.cover_path ? "Change cover" : "Add cover photo"} />
              {couple.cover_path ? (
                <form action={removeCover}>
                  <button type="submit" className="text-sm text-muted hover:text-danger">
                    Remove
                  </button>
                </form>
              ) : null}
            </div>
          </Card>
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

      <Section id="profiles" title="Partner profiles" description="You can edit your own profile. Your partner edits theirs.">
        <div className="grid gap-[var(--os-gap)] md:grid-cols-2">
          <Card className="space-y-5 p-6">
            <div className="flex items-center gap-4">
              <Avatar name={me.displayName} src={me.avatarPath ? urls[me.avatarPath] : null} size={64} />
              <div className="space-y-2">
                <ImageUpload target={{ kind: "avatar" }} label={me.avatarPath ? "Change photo" : "Add photo"} />
                {me.avatarPath ? (
                  <form action={removeAvatar}>
                    <button type="submit" className="text-xs text-muted hover:text-danger">
                      Remove photo
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
            <ProfileForm profile={{ displayName: me.displayName, birthday: me.birthday }} />
          </Card>

          <Card className="p-6">
            {partner ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar name={partner.displayName} src={partner.avatarPath ? urls[partner.avatarPath] : null} size={64} />
                  <div>
                    <p className="os-display text-2xl text-ink">{partner.displayName}</p>
                    <p className="text-sm text-muted">Joined {formatInstant(partner.joinedAt, tz, { dateStyle: "long" })}</p>
                  </div>
                </div>
                <dl className="text-sm">
                  <dt className="text-muted">Birthday</dt>
                  <dd className="text-ink">{partner.birthday ? formatCalendarDate(partner.birthday, { month: "long", day: "numeric" }) : "Not added yet"}</dd>
                </dl>
              </div>
            ) : (
              <div className="flex h-full flex-col justify-center text-center">
                <p className="os-display text-2xl text-ink">Your partner&apos;s spot</p>
                <p className="mt-2 text-sm text-muted">Their profile appears here once they join.</p>
              </div>
            )}
          </Card>
        </div>
      </Section>

      <Section id="appearance" title="Appearance" description="Theme, colors, typography and layout. Both of you see the same look.">
        <ThemeForm theme={toThemeSettings(space.theme)} />
      </Section>

      <Section id="invitation" title="Invitation" description="A space is for exactly two people.">
        <Card className="p-6">
          {partner ? (
            <div className="flex items-center gap-4">
              <Avatar name={partner.displayName} src={partner.avatarPath ? urls[partner.avatarPath] : null} size={44} />
              <div>
                <p className="text-ink">
                  <span className="font-medium">{partner.displayName}</span> is your partner in this space.
                </p>
                <p className="text-sm text-muted">Joined {formatInstant(partner.joinedAt, tz, { dateStyle: "long" })}. This space is full.</p>
              </div>
            </div>
          ) : pendingInvitation ? (
            <div className="space-y-4">
              <div>
                <p className="os-eyebrow">
                  {Date.parse(pendingInvitation.expires_at) <= currentTimeMs() ? "Invitation expired" : "Invitation pending"}
                </p>
                <p className="os-display mt-2 text-2xl break-all text-ink">{pendingInvitation.invited_email}</p>
                <p className="mt-1 text-sm text-muted">
                  Invited {formatInstant(pendingInvitation.created_at, tz, { dateStyle: "long" })} · last sent{" "}
                  {formatInstant(pendingInvitation.last_sent_at, tz, { dateStyle: "medium", timeStyle: "short" })} ·{" "}
                  {Date.parse(pendingInvitation.expires_at) <= currentTimeMs() ? "expired" : "expires"}{" "}
                  {formatInstant(pendingInvitation.expires_at, tz, { dateStyle: "long" })}
                </p>
              </div>
              <PendingInvitationActions invitationId={pendingInvitation.id} />
              <details className="text-sm">
                <summary className="cursor-pointer text-muted hover:text-ink">Invite a different email instead</summary>
                <div className="mt-4">
                  <InvitePartnerForm />
                </div>
              </details>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-ink">No one has been invited yet.</p>
              <InvitePartnerForm />
            </div>
          )}
        </Card>
      </Section>

      <Section id="danger" title="Delete this space" description="Removes the space for both of you. Other spaces are not affected.">
        <DeleteSpaceForm />
      </Section>
    </div>
  );
}
