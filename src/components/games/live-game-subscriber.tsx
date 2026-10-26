"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { he } from "@/config/strings";
import { getBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils/cn";

const REFRESH_DEBOUNCE_MS = 500;
/** Safety net when the socket is down (e.g. a phone waking from sleep): refetch on this interval. */
const FALLBACK_POLL_MS = 20_000;

/**
 * Keeps a live game page fresh: listens to Realtime changes for this game and re-renders the
 * server page (router.refresh) so the score, box score and play-by-play stay in one source of truth.
 */
export function LiveGameSubscriber({ gameId, className }: { gameId: number; className?: string }) {
  const router = useRouter();
  const [connected, setConnected] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const refresh = () => {
      // Avoid RSC refetch work while backgrounded (iOS PWAs are memory-sensitive on resume).
      if (document.visibilityState !== "visible") return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), REFRESH_DEBOUNCE_MS);
    };

    const client = getBrowserClient();
    const channel = client
      ?.channel(`game-${gameId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "player_game_stats", filter: `game_id=eq.${gameId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_events", filter: `game_id=eq.${gameId}` }, refresh)
      .subscribe((status) => {
        const ok = status === "SUBSCRIBED";
        setConnected(ok);
        if (ok) refresh();
      });

    const poll = setInterval(() => {
      if (document.visibilityState === "visible" && channel?.state !== "joined") router.refresh();
    }, FALLBACK_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      if (timer.current) clearTimeout(timer.current);
      if (channel) void client?.removeChannel(channel);
    };
  }, [gameId, router]);

  return (
    <span
      className={cn("inline-flex items-center gap-2 rounded-full bg-loss/15 px-3 py-1 text-xs font-bold text-loss", className)}
      role="status"
      aria-live="polite"
    >
      <span className="relative flex size-2.5" aria-hidden>
        {connected ? <span className="absolute inline-flex size-full animate-ping rounded-full bg-loss opacity-75" /> : null}
        <span className={cn("relative inline-flex size-2.5 rounded-full", connected ? "bg-loss" : "bg-muted")} />
      </span>
      {connected ? he.live.badge : he.live.reconnecting}
    </span>
  );
}
