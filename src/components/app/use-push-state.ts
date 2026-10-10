"use client";

import { useEffect, useState } from "react";
import { detectPushState, PUSH_CHANGE_EVENT, type PushState } from "@/lib/push/client";

export function usePushState(): [PushState, (next: PushState) => void] {
  const [state, setState] = useState<PushState>("loading");

  useEffect(() => {
    let alive = true;
    const refresh = () =>
      void detectPushState().then((next) => {
        if (alive) setState(next);
      });
    refresh();
    window.addEventListener(PUSH_CHANGE_EVENT, refresh);
    // Permission can change in browser settings while the tab is in the background.
    document.addEventListener("visibilitychange", refresh);
    return () => {
      alive = false;
      window.removeEventListener(PUSH_CHANGE_EVENT, refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return [state, setState];
}
