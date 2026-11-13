"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellRing,
  ClipboardList,
  LayoutDashboard,
  type LucideIcon,
  MessageSquareQuote,
  Newspaper,
  ScanSearch,
  Settings,
  ShieldCheck,
  Trophy,
  UserRound,
  Users,
  Whistle,
} from "lucide-react";
import { he } from "@/config/strings";
import { cn } from "@/lib/utils/cn";

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: number;
}

const contentLinksBase: Omit<NavLink, "badge">[] = [
  { href: "/admin", label: he.admin.dashboard, icon: LayoutDashboard, exact: true },
  { href: "/admin/games", label: he.admin.games, icon: Trophy },
  { href: "/admin/scouting", label: he.admin.scoutingNotes, icon: ScanSearch },
  { href: "/admin/players", label: he.admin.players, icon: Users },
  { href: "/admin/coaches", label: he.admin.coaches, icon: Whistle },
  { href: "/admin/plays", label: he.admin.exercises, icon: ClipboardList },
  { href: "/admin/locker-room", label: he.admin.posts, icon: Newspaper },
  { href: "/admin/cliches", label: he.admin.cliches, icon: MessageSquareQuote },
  { href: "/admin/notifications", label: he.admin.notifications, icon: BellRing },
];

const accountLinks: NavLink[] = [
  { href: "/admin/settings", label: he.admin.settings, icon: Settings },
  { href: "/admin/admins", label: he.admin.admins, icon: ShieldCheck },
  { href: "/admin/account", label: he.admin.account, icon: UserRound },
];

function isActive(link: NavLink, pathname: string): boolean {
  return link.exact ? pathname === link.href : pathname.startsWith(link.href);
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ms-auto inline-flex min-w-5 items-center justify-center rounded-full bg-team px-1.5 text-[11px] font-bold text-black">
      {he.admin.clicheModeration.pendingBadge(count)}
    </span>
  );
}

export function AdminNav({
  orientation = "vertical",
  pendingCliches = 0,
}: {
  orientation?: "vertical" | "horizontal";
  pendingCliches?: number;
}) {
  const pathname = usePathname();
  const contentLinks: NavLink[] = contentLinksBase.map((link) =>
    link.href === "/admin/cliches" ? { ...link, badge: pendingCliches } : link,
  );
  return orientation === "horizontal" ? (
    <ChipNav pathname={pathname} links={[...contentLinks, ...accountLinks]} />
  ) : (
    <SideNav pathname={pathname} contentLinks={contentLinks} />
  );
}

function ChipNav({ pathname, links }: { pathname: string; links: NavLink[] }) {
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [pathname]);

  return (
    <nav aria-label={he.admin.title} className="-mx-4 overflow-x-auto px-4 py-1 scrollbar-none">
      <ul className="flex gap-2">
        {links.map((link) => {
          const active = isActive(link, pathname);
          const Icon = link.icon;
          return (
            <li key={link.href} className="shrink-0">
              <Link
                ref={active ? activeRef : undefined}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors",
                  active
                    ? "border-team bg-team text-black shadow-sm shadow-team/30"
                    : "border-border bg-surface-2 text-muted hover:border-team/50 hover:text-text",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {link.label}
                {link.badge ? (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-black/15 px-1.5 text-[11px] font-bold">
                    {he.admin.clicheModeration.pendingBadge(link.badge)}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SideNav({ pathname, contentLinks }: { pathname: string; contentLinks: NavLink[] }) {
  const renderGroup = (links: NavLink[]) => (
    <ul className="flex flex-col gap-1">
      {links.map((link) => {
        const active = isActive(link, pathname);
        const Icon = link.icon;
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-full px-3 py-2 text-sm font-semibold transition-colors",
                active ? "bg-team text-black" : "text-muted hover:bg-surface-2 hover:text-text",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{link.label}</span>
              <Badge count={link.badge ?? 0} />
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <nav aria-label={he.admin.title} className="card sticky top-4 space-y-2 p-2">
      {renderGroup(contentLinks)}
      <hr className="mx-3 border-border" />
      {renderGroup(accountLinks)}
    </nav>
  );
}
