import { he } from "@/config/strings";
import type { Game } from "@/types/domain";

export type GameResult = "win" | "loss";

export function isCountedGame(game: Pick<Game, "status" | "isPublished" | "isPractice" | "isCup">): boolean {
  return game.status === "final" && game.isPublished && !game.isPractice && !game.isCup;
}

/** Round / cup / practice label for cards and headers; null when none apply. */
export function gameKindLabel(game: Pick<Game, "roundNumber" | "isCup" | "isPractice">): string | null {
  if (game.isCup) return he.games.cup;
  if (game.roundNumber) return he.games.round(game.roundNumber);
  if (game.isPractice) return he.games.practice;
  return null;
}

export function gameResult(game: Pick<Game, "status" | "teamScore" | "opponentScore">): GameResult | null {
  if (game.status !== "final" || game.teamScore === null || game.opponentScore === null) return null;
  if (game.teamScore === game.opponentScore) return null;
  return game.teamScore > game.opponentScore ? "win" : "loss";
}

/**
 * House rule for every scoreboard: the home team is shown on the right (the start side in Hebrew).
 * We are on the right at home and at a neutral venue, and on the left away.
 */
export function weAreOnRight(game: { homeAway: string }): boolean {
  return game.homeAway !== "away";
}

/** "left:right" text for a score in a left-to-right box, with the home side on the right. */
export function scoreLeftToRight(game: { homeAway: string; teamScore: number | null; opponentScore: number | null }): string {
  return weAreOnRight(game) ? `${game.opponentScore}:${game.teamScore}` : `${game.teamScore}:${game.opponentScore}`;
}

const byTipoff = (a: Game, b: Game) => a.tipoffAt.localeCompare(b.tipoffAt);

export function completedGames(games: Game[]): Game[] {
  return games.filter((g) => gameResult(g) !== null).sort(byTipoff);
}

/** Games that feed player/team averages and leaderboards (an excluded game keeps its score and W–L only). */
export function statCompletedGames(games: Game[]): Game[] {
  return completedGames(games.filter((g) => !g.excludeFromStats));
}

/** Final published non-practice games that count toward the season record. */
export function recordGames(games: Game[]): Game[] {
  return games.filter((g) => isCountedGame(g) && gameResult(g) !== null).sort(byTipoff);
}

export function isUpcomingGame(game: Pick<Game, "status">): boolean {
  return game.status === "scheduled" || game.status === "live" || game.status === "postponed";
}

export function upcomingGames(games: Game[]): Game[] {
  return games.filter(isUpcomingGame).sort(byTipoff);
}

export function record(games: Game[]): { wins: number; losses: number } {
  let wins = 0;
  let losses = 0;
  for (const g of recordGames(games)) {
    const r = gameResult(g);
    if (r === "win") wins++;
    else if (r === "loss") losses++;
  }
  return { wins, losses };
}

/** Current run of consecutive identical results, counted from the most recent record game. */
export function currentStreak(games: Game[]): { type: GameResult; count: number } | null {
  const done = recordGames(games).reverse();
  const first = done[0];
  if (!first) return null;
  const type = gameResult(first)!;
  let count = 0;
  for (const g of done) {
    if (gameResult(g) !== type) break;
    count++;
  }
  return { type, count };
}

export function lastGame(games: Game[]): Game | null {
  return completedGames(games).at(-1) ?? null;
}

/** Live game first; otherwise the earliest scheduled game. */
export function nextGame(games: Game[]): Game | null {
  const live = games.find((g) => g.status === "live");
  if (live) return live;
  return games.filter((g) => g.status === "scheduled").sort(byTipoff)[0] ?? null;
}
