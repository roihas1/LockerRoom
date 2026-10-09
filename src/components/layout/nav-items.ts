import { BarChart3, CalendarDays, ClipboardList, Flame, Home, Users, type LucideIcon } from "lucide-react";
import { he } from "@/config/strings";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { href: "/", label: he.nav.home, icon: Home },
  { href: "/games", label: he.nav.games, icon: CalendarDays },
  { href: "/stats", label: he.nav.stats, icon: BarChart3 },
  { href: "/plays", label: he.nav.training, icon: ClipboardList },
  { href: "/players", label: he.nav.roster, icon: Users },
  { href: "/locker-room", label: he.nav.lockerRoom, icon: Flame },
];

/** Mobile bottom bar shows these four plus a "more" sheet holding the rest. */
export const bottomNavHrefs = ["/", "/games", "/stats", "/players"];

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
