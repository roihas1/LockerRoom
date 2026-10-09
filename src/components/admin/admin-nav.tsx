"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  LayoutDashboard,
  type LucideIcon,
  Newspaper,
  Settings,
  ShieldCheck,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import { he } from "@/config/strings";
import { cn } from "@/lib/utils/cn";

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const contentLinks: NavLink[] = [
  { href: "/admin", label: he.admin.dashboard, icon: LayoutDashboard, exact: true },
  { href: "/admin/games", label: he.admin.games, icon: Trophy },
  { href: "/admin/players", label: he.admin.players, icon: Users },
  { href: "/admin/plays", label: he.admin.exercises, icon: ClipboardList },
  { href: "/admin/locker-room", label: he.admin.posts, icon: Newspaper },
];

const accountLinks: NavLink[] = [
  { href: "/admin/settings", label: he.admin.settings, icon: Settings },
  { href: "/admin/admins", label: he.admin.admins, icon: ShieldCheck },
  { href: "/admin/account", label: he.admin.account, icon: UserRound },
];

function isActive(link: NavLink, pathname: string): boolean {
  return link.exact ? pathname === link.href : pathname.startsWith(link.href);
}

export function AdminNav({ orientation = "vertical" }: { orientation?: "vertical" | "horizontal" }) {
  const pathname = usePathname();
  return orientation === "horizontal" ? <ChipNav pathname={pathname} /> : <SideNav pathname={pathname} />;
}

function ChipNav({ pathname }: { pathname: string }) {
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [pathname]);

  return (
    <nav aria-label={he.admin.title} className="-mx-4 overflow-x-auto px-4 py-1 scrollbar-none">
      <ul className="flex gap-2">
        {[...contentLinks, ...accountLinks].map((link) => {
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
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SideNav({ pathname }: { pathname: string }) {
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
              {link.label}
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
