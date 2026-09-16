"use client";

import { BookOpen, CalendarDays, House, Images, Mail, MapPin, Sparkles, StickyNote } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/home", label: "Home", icon: House },
  { href: "/story", label: "Story", icon: BookOpen },
  { href: "/milestones", label: "Milestones", icon: Sparkles },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/memories", label: "Memories", icon: Images },
  { href: "/letters", label: "Letters", icon: Mail },
  { href: "/places", label: "Places", icon: MapPin },
  { href: "/notes", label: "Notes", icon: StickyNote },
];

export function SpaceNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Sections" className="sticky top-0 z-20 border-b border-line/70 bg-canvas/85 backdrop-blur-md">
      <ul className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-3 py-2 [scrollbar-width:none] sm:px-5 [&::-webkit-scrollbar]:hidden">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-9 items-center gap-2 rounded-full px-3.5 text-sm transition ${
                  active ? "bg-accent text-on-accent shadow-sm" : "text-muted hover:bg-accent-soft hover:text-ink"
                }`}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
