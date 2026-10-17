import { siteConfig } from "@/config/site";
import type { Game } from "@/types/domain";
import type { PlayerAggregate } from "./aggregate";
import { isCountedGame } from "./games";

export type LeaderCategory = "points" | "assists" | "rebounds" | "threes" | "steals" | "blocks" | "pir" | "potg";

export interface LeaderEntry {
  playerId: number;
  /** Per-game value, except `threes` and `potg` which are season totals. */
  value: number;
  gp: number;
}

export interface LeaderBoard {
  category: LeaderCategory;
  entries: LeaderEntry[];
}

export const leaderCategories: LeaderCategory[] = ["points", "assists", "rebounds", "threes", "steals", "blocks", "pir", "potg"];

export function minGamesForLeaders(completedGames: number, ratio = siteConfig.leaderMinGamesRatio): number {
  return Math.max(1, Math.ceil(completedGames * ratio));
}

/** POTG selections on counted (final, published, non-practice) games. */
export function countPotgByPlayer(games: Pick<Game, "playerOfGameId" | "status" | "isPublished" | "isPractice">[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const g of games) {
    if (!isCountedGame(g) || g.playerOfGameId == null) continue;
    counts.set(g.playerOfGameId, (counts.get(g.playerOfGameId) ?? 0) + 1);
  }
  return counts;
}

function valueFor(agg: PlayerAggregate, category: LeaderCategory, potgCounts: Map<number, number>): number | null {
  switch (category) {
    case "points":
      return agg.ppg;
    case "assists":
      return agg.apg;
    case "rebounds":
      return agg.rpg;
    case "threes":
      return agg.three.games > 0 ? agg.three.made : null;
    case "steals":
      return agg.steals.perGame;
    case "blocks":
      return agg.blocks.perGame;
    case "pir":
      return agg.pirPerGame;
    case "potg":
      return potgCounts.get(agg.playerId) ?? null;
  }
}

/** Leaders per category. Categories with no recorded data are dropped. */
export function computeLeaders(
  aggregates: PlayerAggregate[],
  completedGames: number,
  {
    limit = 3,
    categories = leaderCategories,
    potgCounts = new Map<number, number>(),
  }: { limit?: number; categories?: LeaderCategory[]; potgCounts?: Map<number, number> } = {},
): LeaderBoard[] {
  const minGp = minGamesForLeaders(completedGames);
  const boards: LeaderBoard[] = [];
  for (const category of categories) {
    const entries = aggregates
      .filter((a) => a.gp >= minGp)
      .map((a) => ({ playerId: a.playerId, value: valueFor(a, category, potgCounts), gp: a.gp }))
      .filter((e): e is LeaderEntry => e.value !== null && e.value > 0)
      .sort((a, b) => b.value - a.value || a.playerId - b.playerId)
      .slice(0, limit);
    if (entries.length > 0) boards.push({ category, entries });
  }
  return boards;
}
