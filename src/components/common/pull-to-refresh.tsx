"use client";

import { useEffect, useRef, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { he } from "@/config/strings";
import { cn } from "@/lib/utils/cn";
import { haptic } from "@/lib/utils/haptics";

const TRIGGER_PX = 72;
const MAX_PULL_PX = 110;
/** Finger travel is damped so the indicator lags behind, like native pull to refresh. */
const DAMPING = 0.5;

/**
 * Touch-only pull to refresh that re-fetches the server components of the current route.
 *
 * Pull distance is applied via DOM (not React state) so dragging does not re-render the page
 * tree on every touchmove — critical on memory-tight iOS standalone PWAs.
 */
export function PullToRefresh({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const startY = useRef<number | null>(null);
  const armed = useRef(false);
  const pullRef = useRef(0);
  const pendingRef = useRef(false);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    pendingRef.current = pending;
    const indicator = indicatorRef.current;
    if (!indicator) return;
    if (pending) {
      indicator.style.height = "48px";
      if (labelRef.current) labelRef.current.textContent = he.fun.pull.refreshing;
      if (iconRef.current) {
        iconRef.current.style.transform = "";
        iconRef.current.classList.add("motion-safe:animate-spin");
      }
    } else if (pullRef.current <= 8) {
      indicator.style.height = "0px";
      if (iconRef.current) iconRef.current.classList.remove("motion-safe:animate-spin");
    }
  }, [pending]);

  useEffect(() => {
    function paint(pull: number) {
      const indicator = indicatorRef.current;
      if (!indicator) return;
      const visible = pendingRef.current || pull > 8;
      indicator.style.height = visible ? `${pendingRef.current ? 48 : pull}px` : "0px";
      if (iconRef.current && !pendingRef.current) {
        iconRef.current.classList.remove("motion-safe:animate-spin");
        iconRef.current.style.transform = `rotate(${pull * 4}deg)`;
      }
      if (labelRef.current && !pendingRef.current) {
        labelRef.current.textContent = pull >= TRIGGER_PX ? he.fun.pull.release : he.fun.pull.pull;
      }
    }

    function schedulePaint(pull: number) {
      pullRef.current = pull;
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        paint(pullRef.current);
      });
    }

    function onStart(e: TouchEvent) {
      startY.current = window.scrollY <= 0 && e.touches.length === 1 ? e.touches[0]!.clientY : null;
      armed.current = false;
    }
    function onMove(e: TouchEvent) {
      if (startY.current === null) return;
      const dy = (e.touches[0]!.clientY - startY.current) * DAMPING;
      if (dy <= 0 || window.scrollY > 0) {
        if (pullRef.current !== 0) schedulePaint(0);
        return;
      }
      const next = Math.min(MAX_PULL_PX, dy);
      if (next >= TRIGGER_PX && !armed.current) {
        armed.current = true;
        haptic(12);
      } else if (next < TRIGGER_PX) {
        armed.current = false;
      }
      schedulePaint(next);
    }
    function onEnd() {
      if (startY.current === null) return;
      startY.current = null;
      if (armed.current) startTransition(() => router.refresh());
      armed.current = false;
      schedulePaint(0);
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
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [router]);

  return (
    <>
      <div
        ref={indicatorRef}
        aria-live="polite"
        className={cn("flex items-end justify-center overflow-hidden text-xs font-semibold text-muted")}
        style={{ height: 0 }}
      >
        <span className="flex items-center gap-2 pb-2">
          <span ref={iconRef} aria-hidden className="inline-block text-lg">
            🏀
          </span>
          <span ref={labelRef}>{he.fun.pull.pull}</span>
        </span>
      </div>
      {children}
    </>
  );
}
