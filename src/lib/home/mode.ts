import { lastGame, nextGame } from "@/lib/stats/games";
import { dateInIsrael } from "@/lib/utils/dates";
import type { Game } from "@/types/domain";

export type HomeMode = "gameDay" | "postGame" | "default";

export const POST_GAME_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * What the home page should lead with: the game when it is today (or live),
 * the result for two days after a game, otherwise the regular layout.
 */
export function homeMode(games: Game[], now: number = Date.now()): HomeMode {
  const next = nextGame(games);
  if (next && (next.status === "live" || dateInIsrael(next.tipoffAt) === dateInIsrael(now))) return "gameDay";
  const last = lastGame(games);
  if (last) {
    const since = now - Date.parse(last.tipoffAt);
    if (since >= 0 && since <= POST_GAME_WINDOW_MS) return "postGame";
  }
  return "default";
}
