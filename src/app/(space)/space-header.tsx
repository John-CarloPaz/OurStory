import { Check, ChevronDown, LogOut, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { switchSpace } from "@/app/actions/spaces";
import { Avatar } from "@/components/ui/layout";

type Props = {
  names: string;
  title: string;
  coupleName: string | null;
  waitingForPartner: boolean;
  members: { name: string; avatarUrl: string | null }[];
  memberships: { coupleId: string; label: string }[];
  activeCoupleId: string;
  email: string;
};

export function SpaceHeader({ names, title, coupleName, waitingForPartner, members, memberships, activeCoupleId, email }: Props) {
  return (
    <header className="border-b border-line/70">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/home" className="group flex min-w-0 items-center gap-3">
          <span className="flex -space-x-2.5">
            {members.map((m, i) => (
              <Avatar key={i} name={m.name} src={m.avatarUrl} size={36} />
            ))}
          </span>
          <span className="min-w-0">
            <span className="os-display block truncate text-xl leading-tight text-ink">
              {names}
              {waitingForPartner ? <span className="text-accent"> ♡</span> : null}
            </span>
            <span className="block truncate text-xs text-muted">{coupleName && coupleName !== names ? `${coupleName} · ${title}` : title}</span>
          </span>
        </Link>

        <details className="group relative">
          <summary className="flex h-10 cursor-pointer list-none items-center gap-1 rounded-full px-3 text-sm text-muted transition hover:bg-accent-soft hover:text-ink [&::-webkit-details-marker]:hidden">
            <span className="hidden sm:inline">Menu</span>
            <ChevronDown className="size-4 transition group-open:rotate-180" aria-hidden />
          </summary>
          <div className="os-card absolute right-0 z-30 mt-2 w-72 p-2 text-sm">
            <p className="truncate px-3 pt-2 pb-3 text-xs text-muted">{email}</p>
            <Link href="/settings" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-ink hover:bg-accent-soft">
              <Settings className="size-4 text-muted" aria-hidden /> Settings
            </Link>

            <div className="my-2 border-t border-line" />
            <p className="px-3 pt-1 pb-2 text-xs font-medium tracking-wide text-muted uppercase">Your spaces</p>
            {memberships.map((m) => (
              <form key={m.coupleId} action={switchSpace}>
                <input type="hidden" name="coupleId" value={m.coupleId} />
                <button
                  type="submit"
                  className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-ink hover:bg-accent-soft"
                >
                  <span className="truncate">{m.label}</span>
                  {m.coupleId === activeCoupleId ? <Check className="size-4 shrink-0 text-accent" aria-label="Current space" /> : null}
                </button>
              </form>
            ))}
            <Link href="/onboarding?another=1" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-muted hover:bg-accent-soft hover:text-ink">
              <Plus className="size-4" aria-hidden /> New space
            </Link>

            <div className="my-2 border-t border-line" />
            <form action={signOut}>
              <button type="submit" className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-ink hover:bg-accent-soft">
                <LogOut className="size-4 text-muted" aria-hidden /> Sign out
              </button>
            </form>
          </div>
        </details>
      </div>
    </header>
  );
}
