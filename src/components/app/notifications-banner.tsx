"use client";

import { Bell, BellRing, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { he } from "@/config/strings";
import { announcePushChange, enablePush, readTopics } from "@/lib/push/client";
import { cn } from "@/lib/utils/cn";
import { stateAfterFailedEnable } from "./notifications-toggle";
import { usePushState } from "./use-push-state";

const DISMISS_KEY = "lr:notify-banner-dismissed";
const DISMISS_DAYS = 7;

/**
 * Top-of-page call to action for visitors who can get push but haven't subscribed.
 * iPhone visitors outside the installed app get the install banner instead, since push needs it there.
 */
export function NotificationsBanner() {
  const [state, setState] = usePushState();
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const until = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    const frame = requestAnimationFrame(() => setDismissed(Date.now() < until));
    return () => cancelAnimationFrame(frame);
  }, []);

  if (state !== "off" || dismissed || pathname === "/join" || pathname.startsWith("/admin")) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 86_400_000));
    setDismissed(true);
  };

  const enable = () =>
    startTransition(async () => {
      const result = await enablePush(readTopics());
      if (result.ok) {
        setState("on");
        announcePushChange();
        toast.success(he.app.notificationsOn);
        return;
      }
      setState(stateAfterFailedEnable(result.reason));
      toast.error(result.reason === "denied" ? he.app.notificationsBlocked : he.app.notificationsFailed);
    });

  return (
    <section
      aria-label={he.app.notifications}
      className="relative mb-5 overflow-hidden rounded-2xl border border-team/40 bg-linear-to-l from-team/20 via-team/10 to-transparent p-4 md:mb-8"
    >
      <button
        type="button"
        onClick={dismiss}
        className="absolute end-2 top-2 rounded-lg p-1.5 text-muted hover:text-text"
        aria-label={he.app.dismiss}
      >
        <X className="size-4" />
      </button>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3 pe-6 sm:flex-1">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-team/20 text-team">
            <BellRing className={cn("size-5", !pending && "motion-safe:animate-wiggle")} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-display text-base font-extrabold">{he.app.banner.title}</p>
            <p className="text-sm text-muted">{he.app.banner.text}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:shrink-0">
          <Button onClick={enable} disabled={pending} className="flex-1 sm:flex-none">
            <Bell aria-hidden />
            {he.app.enableNotifications}
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/join#notifications">{he.app.banner.choose}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/** Header shortcut to the notification settings; the dot nudges visitors who haven't turned them on. */
export function NotificationsBell() {
  const [state] = usePushState();
  if (state === "loading" || state === "unsupported" || state === "unavailable") return null;
  const nudge = state === "off" || state === "needs-install";
  return (
    <Link
      href="/join#notifications"
      aria-label={state === "on" ? he.app.notificationsOn : he.app.enableNotifications}
      className="relative grid size-10 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-text"
    >
      {state === "on" ? <BellRing className="size-5 text-team" aria-hidden /> : <Bell className="size-5" aria-hidden />}
      {nudge ? <span className="absolute end-2 top-2 size-2.5 rounded-full bg-loss ring-2 ring-bg" aria-hidden /> : null}
    </Link>
  );
}
