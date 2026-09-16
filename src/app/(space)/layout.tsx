import { signMediaUrls } from "@/lib/storage/media";
import { partnerNames, requireActiveSpace } from "@/lib/tenant";
import { backgroundClass, themeVariables, toThemeSettings } from "@/lib/theme";
import { SpaceHeader } from "./space-header";
import { SpaceNav } from "./space-nav";

/**
 * The tenant workspace. Everything rendered below comes from the active
 * couple's own rows — names, title, avatars and the full theme — so the same
 * deployment renders a different world for every couple.
 */
export default async function SpaceLayout({ children }: { children: React.ReactNode }) {
  const space = await requireActiveSpace();
  const theme = toThemeSettings(space.theme);
  const urls = await signMediaUrls(space, space.members.map((m) => m.avatarPath));

  return (
    <div style={themeVariables(theme)} className={`${backgroundClass(theme.background_style)} min-h-dvh text-ink`}>
      <SpaceHeader
        names={partnerNames(space)}
        title={space.couple.display_title}
        coupleName={space.couple.name}
        waitingForPartner={!space.partner}
        members={space.members.map((m) => ({
          name: m.displayName,
          avatarUrl: m.avatarPath ? (urls[m.avatarPath] ?? null) : null,
        }))}
        memberships={space.memberships}
        activeCoupleId={space.coupleId}
        email={space.email}
      />
      <SpaceNav />
      <main className="mx-auto w-full max-w-5xl px-4 pt-8 pb-24 sm:px-6 sm:pt-12">{children}</main>
    </div>
  );
}
