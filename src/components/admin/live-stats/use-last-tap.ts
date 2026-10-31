"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { liveTapHaptic, liveTapLabel, type LiveTapKind } from "@/lib/live-stats/tap-feedback";

const CHIP_MS = 1600;

/**
 * Last-action chip + flash key for button pop / number tick after a scoring tap.
 */
export function useLastTap() {
  const [label, setLabel] = useState<string | null>(null);
  const [flashKey, setFlashKey] = useState<string | null>(null);
  const [flashNonce, setFlashNonce] = useState(0);
  const clearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (clearRef.current) clearTimeout(clearRef.current);
    };
  }, []);

  const announce = useCallback((kind: LiveTapKind, delta: number, key: string) => {
    if (delta === 0) return;
    liveTapHaptic(kind, delta);
    setLabel(liveTapLabel(kind, delta));
    setFlashKey(key);
    setFlashNonce((n) => n + 1);
    if (clearRef.current) clearTimeout(clearRef.current);
    clearRef.current = setTimeout(() => {
      setLabel(null);
      clearRef.current = null;
    }, CHIP_MS);
  }, []);

  const isFlashing = useCallback((key: string) => flashKey === key, [flashKey]);

  return { label, flashKey, flashNonce, announce, isFlashing };
}
