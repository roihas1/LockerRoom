"use client";

import { useSyncExternalStore } from "react";
import { BellRing } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { he } from "@/config/strings";

const subscribe = () => () => {};

/** Android has no webcal handler, so it subscribes through Google Calendar instead. */
function isAndroid(): boolean {
  return /android/i.test(navigator.userAgent);
}

export function SubscribeButton({ webcal, google }: { webcal: string; google: string }) {
  const android = useSyncExternalStore(subscribe, isAndroid, () => false);
  return (
    <a
      href={android ? google : webcal}
      {...(android ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={buttonVariants({ size: "sm" })}
    >
      <BellRing aria-hidden />
      {he.games.subscribeReminders}
    </a>
  );
}
