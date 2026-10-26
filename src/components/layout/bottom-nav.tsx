"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { he } from "@/config/strings";
import { cn } from "@/lib/utils/cn";
import { bottomNavHrefs, isActive, navItems } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const primary = navItems.filter((i) => bottomNavHrefs.includes(i.href));
  const more = navItems.filter((i) => !bottomNavHrefs.includes(i.href));
  const moreActive = more.some((i) => isActive(pathname, i.href));

  const itemClass = (active: boolean) =>
    cn(
      "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors",
      active ? "text-team" : "text-muted",
    );

  return (
    <nav
      aria-label={he.nav.mainLabel}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg pb-safe md:hidden"
    >
      <ul className="mx-auto flex max-w-lg">
        {primary.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex flex-1">
              <Link href={item.href} aria-current={active ? "page" : undefined} className={itemClass(active)}>
                <Icon className="size-5" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
        <li className="flex flex-1">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className={itemClass(moreActive)}>
              <MoreHorizontal className="size-5" aria-hidden />
              {he.nav.more}
            </DialogTrigger>
            <DialogContent title={he.nav.moreTitle} variant="sheet">
              <ul className="grid gap-2">
                {more.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border border-border p-4 text-base font-semibold",
                          active ? "border-team/40 bg-team/10 text-team" : "bg-surface-2",
                        )}
                      >
                        <Icon className="size-5" aria-hidden />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </DialogContent>
          </Dialog>
        </li>
      </ul>
    </nav>
  );
}
