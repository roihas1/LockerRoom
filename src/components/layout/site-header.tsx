import Link from "next/link";
import type { Team } from "@/types/domain";
import { NotificationsBell } from "@/components/app/notifications-banner";
import { AppMark } from "@/components/common/team-logo";
import { he } from "@/config/strings";
import { AdminLink } from "./admin-link";
import { DesktopNav } from "./desktop-nav";

export function SiteHeader({ team }: { team: Team }) {
  // Solid, unblurred background: Safari 26 only tints the status bar from a sticky top bar without backdrop-filter.
  return (
    <header data-easter-header className="sticky top-0 z-40 border-b border-border/70 bg-bg pt-safe">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 md:h-16">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <span data-easter-logo className="shrink-0 touch-manipulation select-none [-webkit-touch-callout:none]">
            <AppMark className="size-9" priority />
          </span>
          <span className="min-w-0 leading-tight">
            <span data-user-content className="block truncate font-display text-base font-extrabold">
              {team.name}
            </span>
            <span className="block text-[10px] font-semibold tracking-[0.2em] text-team uppercase">{he.brandSubtitle}</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <DesktopNav />
          <NotificationsBell />
          <AdminLink />
        </div>
      </div>
    </header>
  );
}
