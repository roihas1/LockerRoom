"use client";

import { useEffect, useRef, type RefObject } from "react";

const MIN_DISTANCE = 70;
/** Horizontal movement must dominate vertical by this factor, so page scrolling never counts as a swipe. */
const DOMINANCE = 1.8;

/**
 * Horizontal touch swipe on an element. Reports the physical direction of the finger;
 * callers decide what "next" means (in RTL, the next item lives to the left, so a rightward swipe reveals it).
 */
export function useSwipe(ref: RefObject<HTMLElement | null>, handlers: { onSwipeLeft?: () => void; onSwipeRight?: () => void }) {
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let start: { x: number; y: number } | null = null;

    function onStart(e: TouchEvent) {
      const t = e.touches[0];
      const target = e.target as HTMLElement | null;
      // Let horizontally scrollable children (tables, carousels) keep their own gestures.
      if (!t || e.touches.length > 1 || target?.closest("[data-no-swipe], .overflow-x-auto")) {
        start = null;
        return;
      }
      start = { x: t.clientX, y: t.clientY };
    }
    function onEnd(e: TouchEvent) {
      const t = e.changedTouches[0];
      if (!start || !t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      start = null;
      if (Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * DOMINANCE) return;
      if (dx < 0) latest.current.onSwipeLeft?.();
      else latest.current.onSwipeRight?.();
    }

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchend", onEnd);
    };
  }, [ref]);
}
