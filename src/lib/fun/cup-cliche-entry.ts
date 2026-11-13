import type { Game } from "@/types/domain";

/** Next upcoming published cup game, if any. */
export function nextCupGame(games: readonly Game[], now = Date.now()): Game | null {
  const upcoming = games
    .filter((g) => g.isCup && g.isPublished && Date.parse(g.tipoffAt) >= now && (g.status === "scheduled" || g.status === "live"))
    .sort((a, b) => Date.parse(a.tipoffAt) - Date.parse(b.tipoffAt));
  return upcoming[0] ?? null;
}

/** Show the home promo while there is an upcoming cup game. */
export function showCupClicheHomeCard(games: readonly Game[], now = Date.now()): Game | null {
  return nextCupGame(games, now);
}
