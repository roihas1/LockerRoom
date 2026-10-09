"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { he } from "@/config/strings";
import { cn } from "@/lib/utils/cn";
import { isActive, navItems } from "./nav-items";

export function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label={he.nav.mainLabel} className="hidden md:block">
      <ul className="flex items-center gap-1">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                  active ? "bg-team/15 text-team" : "text-muted hover:bg-surface-2 hover:text-text",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
