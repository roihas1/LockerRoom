import type { Game } from "@/types/domain";

/** Around a game, public pages must not serve a stale (cached) status or score. */
export const LIVE_WINDOW_MS = 12 * 60 * 60 * 1000;

/**
 * True when a game is live, or not yet final and tips off within the window (before or after).
 * Final games are never "in window": once the cache says final it is final.
 */
export function isInLiveWindow(game: Pick<Game, "status" | "tipoffAt">, now: number = Date.now()): boolean {
  if (game.status === "live") return true;
  if (game.status === "final") return false;
  return Math.abs(Date.parse(game.tipoffAt) - now) <= LIVE_WINDOW_MS;
}

export function anyInLiveWindow(games: Pick<Game, "status" | "tipoffAt">[], now: number = Date.now()): boolean {
  return games.some((g) => isInLiveWindow(g, now));
}
