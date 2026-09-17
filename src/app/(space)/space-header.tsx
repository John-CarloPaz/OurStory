import { Check, LogOut, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { switchSpace } from "@/app/actions/spaces";
import { Avatar } from "@/components/ui/layout";
import { HeaderMenu } from "./header-menu";
import { DesktopNav } from "./space-nav";

type Props = {
  names: string;
  title: string;
  waitingForPartner: boolean;
  members: { name: string; avatarUrl: string | null }[];
  memberships: { coupleId: string; label: string }[];
  activeCoupleId: string;
  email: string;
};

export function SpaceHeader({ names, title, waitingForPartner, members, memberships, activeCoupleId, email }: Props) {
  return (
    <header className="sticky top-0 z-40 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
      <div className="os-glass os-frost mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-full py-1.5 pr-1.5 pl-2 shadow-[0_14px_40px_-24px_rgb(0_0_0/0.4)]">
        <Link href="/home" className="group flex min-w-0 items-center gap-2.5">
          <span className="flex -space-x-3 transition-[margin] duration-300 group-hover:-space-x-1.5">
            {members.map((m, i) => (
              <Avatar key={i} name={m.name} src={m.avatarUrl} size={36} />
            ))}
          </span>
          <span className="min-w-0 pr-1">
            <span className="os-display block truncate text-lg leading-tight text-ink">
              {names}
              {waitingForPartner ? <span className="text-accent"> ♡</span> : null}
            </span>
            <span className="os-hand block truncate text-base leading-none text-muted">{title}</span>
          </span>
        </Link>

        <DesktopNav />

        <HeaderMenu
          summary={
            <summary className="grid size-10 cursor-pointer list-none place-items-center rounded-full text-muted transition hover:bg-accent-soft hover:text-ink [&::-webkit-details-marker]:hidden">
              <span className="sr-only">Menu</span>
              <Settings className="size-5 transition-transform duration-500 group-open:rotate-90" aria-hidden />
            </summary>
          }
        >
          <div className="os-glass os-frost absolute right-0 z-50 mt-3 w-72 origin-top-right animate-[os-pop_0.3s_cubic-bezier(0.34,1.56,0.64,1)_backwards] rounded-3xl p-2 text-sm shadow-2xl">
            <p className="truncate px-3 pt-2 pb-3 text-xs text-muted">{email}</p>
            <Link href="/settings" className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-ink hover:bg-accent-soft">
              <Settings className="size-4 text-muted" aria-hidden /> Settings
            </Link>

            <div className="my-2 border-t border-line" />
            <p className="px-3 pt-1 pb-2 text-xs font-medium tracking-wide text-muted uppercase">Your spaces</p>
            {memberships.map((m) => (
              <form key={m.coupleId} action={switchSpace}>
                <input type="hidden" name="coupleId" value={m.coupleId} />
                <button
                  type="submit"
                  className="flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-left text-ink hover:bg-accent-soft"
                >
                  <span className="truncate">{m.label}</span>
                  {m.coupleId === activeCoupleId ? <Check className="size-4 shrink-0 text-accent" aria-label="Current space" /> : null}
                </button>
              </form>
            ))}
            <Link href="/onboarding?another=1" className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-muted hover:bg-accent-soft hover:text-ink">
              <Plus className="size-4" aria-hidden /> New space
            </Link>

            <div className="my-2 border-t border-line" />
            <form action={signOut}>
              <button type="submit" className="flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left text-ink hover:bg-accent-soft">
                <LogOut className="size-4 text-muted" aria-hidden /> Sign out
              </button>
            </form>
          </div>
        </HeaderMenu>
      </div>
    </header>
  );
}
