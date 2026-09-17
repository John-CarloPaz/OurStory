import { BookOpen, CalendarDays, House, Images, Mail, MapPin, Settings, Sparkles, StickyNote, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { href: "/home", label: "Home", icon: House },
  { href: "/story", label: "Story", icon: BookOpen },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/memories", label: "Memories", icon: Images },
  { href: "/letters", label: "Letters", icon: Mail },
  { href: "/milestones", label: "Milestones", icon: Sparkles },
  { href: "/places", label: "Places", icon: MapPin },
  { href: "/notes", label: "Notes", icon: StickyNote },
];

/** Bottom tab bar on phones: the four most used sections, the rest behind "More". */
export const MOBILE_PRIMARY = ["/home", "/story", "/calendar", "/letters"];

export const MORE_ITEMS: NavItem[] = [
  ...NAV_ITEMS.filter((item) => !MOBILE_PRIMARY.includes(item.href)),
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
