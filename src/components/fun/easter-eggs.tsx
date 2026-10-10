"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { he } from "@/config/strings";
import { playBuzzer } from "@/lib/fun/buzzer";
import { haptic } from "@/lib/utils/haptics";

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
const FIRE_KEY = "lr:fire";
const LONG_PRESS_MS = 2000;
const TAP_WINDOW_MS = 1500;
const TAPS_FOR_BUZZER = 5;

function setFire(on: boolean, announce: boolean) {
  document.documentElement.classList.toggle("fire-mode", on);
  if (on) sessionStorage.setItem(FIRE_KEY, "1");
  else sessionStorage.removeItem(FIRE_KEY);
  if (announce) {
    haptic(on ? [30, 40, 60] : 15);
    if (on) toast(he.fun.eggs.fireOn);
    else toast(he.fun.eggs.fireOff);
  }
}

function toggleFire() {
  setFire(!document.documentElement.classList.contains("fire-mode"), true);
}

function shakeHeader() {
  const header = document.querySelector<HTMLElement>("[data-easter-header]");
  if (!header || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  header.classList.remove("animate-shake");
  void header.offsetWidth;
  header.classList.add("animate-shake");
}

/**
 * Hidden fun, wired to the header logo (`data-easter-logo`):
 * Konami code or a long press toggles fire mode for the session; rapid taps sound the buzzer.
 */
export function EasterEggs() {
  useEffect(() => {
    if (sessionStorage.getItem(FIRE_KEY)) setFire(true, false);

    let konami = 0;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      konami = key === KONAMI[konami] ? konami + 1 : key === KONAMI[0] ? 1 : 0;
      if (konami === KONAMI.length) {
        konami = 0;
        toggleFire();
      }
    }

    let pressTimer: ReturnType<typeof setTimeout> | null = null;
    let longPressed = false;
    let taps: number[] = [];
    const isLogo = (e: Event) => !!(e.target as HTMLElement | null)?.closest("[data-easter-logo]");

    function onPointerDown(e: PointerEvent) {
      if (!isLogo(e)) return;
      longPressed = false;
      pressTimer = setTimeout(() => {
        longPressed = true;
        toggleFire();
      }, LONG_PRESS_MS);
    }
    function cancelPress() {
      if (pressTimer) clearTimeout(pressTimer);
      pressTimer = null;
    }
    function onClick(e: MouseEvent) {
      if (!isLogo(e)) return;
      if (longPressed) {
        e.preventDefault();
        longPressed = false;
        return;
      }
      const now = performance.now();
      taps = [...taps.filter((t) => now - t < TAP_WINDOW_MS), now];
      if (taps.length >= TAPS_FOR_BUZZER) {
        taps = [];
        playBuzzer();
        haptic([60, 30, 60]);
        shakeHeader();
      }
    }
    function onContextMenu(e: MouseEvent) {
      if (isLogo(e)) e.preventDefault();
    }

    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointerup", cancelPress);
    document.addEventListener("pointercancel", cancelPress);
    document.addEventListener("pointerleave", cancelPress);
    document.addEventListener("click", onClick, true);
    document.addEventListener("contextmenu", onContextMenu);
    return () => {
      cancelPress();
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointerup", cancelPress);
      document.removeEventListener("pointercancel", cancelPress);
      document.removeEventListener("pointerleave", cancelPress);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("contextmenu", onContextMenu);
    };
  }, []);

  return null;
}
