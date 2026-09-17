import { AmbientBackground, GrainLayer } from "@/components/decor/ambient-background";
import { signMediaUrls } from "@/lib/storage/media";
import { partnerNames, requireActiveSpace } from "@/lib/tenant";
import { backgroundClass, themeVariables, toThemeSettings } from "@/lib/theme";
import { SpaceHeader } from "./space-header";
import { MobileTabBar } from "./space-nav";

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
    <div style={themeVariables(theme)} className={`os-space ${backgroundClass(theme.background_style)} relative min-h-dvh text-ink`}>
      {theme.background_style === "aurora" ? <AmbientBackground /> : null}
      {theme.background_style !== "plain" ? <GrainLayer /> : null}
      <div className="relative z-10">
        <SpaceHeader
          names={partnerNames(space)}
          title={space.couple.display_title}
          waitingForPartner={!space.partner}
          members={space.members.map((m) => ({
            name: m.displayName,
            avatarUrl: m.avatarPath ? (urls[m.avatarPath] ?? null) : null,
          }))}
          memberships={space.memberships}
          activeCoupleId={space.coupleId}
          email={space.email}
        />
        <main className="mx-auto w-full max-w-6xl px-4 pt-8 pb-36 sm:px-6 sm:pt-12 lg:pb-24">{children}</main>
        <MobileTabBar />
      </div>
    </div>
  );
}
