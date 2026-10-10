"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { he } from "@/config/strings";
import { cn } from "@/lib/utils/cn";
import { haptic } from "@/lib/utils/haptics";

const TRIGGER_PX = 72;
const MAX_PULL_PX = 110;
/** Finger travel is damped so the indicator lags behind, like native pull to refresh. */
const DAMPING = 0.5;

/** Touch-only pull to refresh that re-fetches the server components of the current route. */
export function PullToRefresh({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [pending, startTransition] = useTransition();
  const startY = useRef<number | null>(null);
  const armed = useRef(false);

  useEffect(() => {
    function onStart(e: TouchEvent) {
      startY.current = window.scrollY <= 0 && e.touches.length === 1 ? e.touches[0]!.clientY : null;
      armed.current = false;
    }
    function onMove(e: TouchEvent) {
      if (startY.current === null) return;
      const dy = (e.touches[0]!.clientY - startY.current) * DAMPING;
      if (dy <= 0 || window.scrollY > 0) {
        setPull(0);
        return;
      }
      const next = Math.min(MAX_PULL_PX, dy);
      if (next >= TRIGGER_PX && !armed.current) {
        armed.current = true;
        haptic(12);
      } else if (next < TRIGGER_PX) {
        armed.current = false;
      }
      setPull(next);
    }
    function onEnd() {
      if (startY.current === null) return;
      startY.current = null;
      if (armed.current) startTransition(() => router.refresh());
      armed.current = false;
      setPull(0);
    }
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [router]);

  const visible = pending || pull > 8;
  const height = pending ? 48 : pull;
  const label = pending ? he.fun.pull.refreshing : pull >= TRIGGER_PX ? he.fun.pull.release : he.fun.pull.pull;

  return (
    <>
      <div
        aria-live="polite"
        className={cn("flex items-end justify-center overflow-hidden text-xs font-semibold text-muted", !pull && "transition-[height] duration-200")}
        style={{ height: visible ? height : 0 }}
      >
        {visible ? (
          <span className="flex items-center gap-2 pb-2">
            <span
              aria-hidden
              className={cn("inline-block text-lg", pending && "motion-safe:animate-spin")}
              style={pending ? undefined : { transform: `rotate(${pull * 4}deg)` }}
            >
              🏀
            </span>
            {label}
          </span>
        ) : null}
      </div>
      {children}
    </>
  );
}
