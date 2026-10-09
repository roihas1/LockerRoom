import { siteConfig } from "@/config/site";
import type { PlayerAggregate } from "./aggregate";

export type LeaderCategory = "points" | "assists" | "rebounds" | "threes" | "steals" | "blocks";

export interface LeaderEntry {
  playerId: number;
  /** Per-game value, except `threes` which is a season total. */
  value: number;
  gp: number;
}

export interface LeaderBoard {
  category: LeaderCategory;
  entries: LeaderEntry[];
}

export const leaderCategories: LeaderCategory[] = ["points", "assists", "rebounds", "threes", "steals", "blocks"];

export function minGamesForLeaders(completedGames: number, ratio = siteConfig.leaderMinGamesRatio): number {
  return Math.max(1, Math.ceil(completedGames * ratio));
}

function valueFor(agg: PlayerAggregate, category: LeaderCategory): number | null {
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
  }
}

/** Leaders per category. Categories with no recorded data are dropped. */
export function computeLeaders(
  aggregates: PlayerAggregate[],
  completedGames: number,
  { limit = 3, categories = leaderCategories }: { limit?: number; categories?: LeaderCategory[] } = {},
): LeaderBoard[] {
  const minGp = minGamesForLeaders(completedGames);
  const boards: LeaderBoard[] = [];
  for (const category of categories) {
    const entries = aggregates
      .filter((a) => a.gp >= minGp)
      .map((a) => ({ playerId: a.playerId, value: valueFor(a, category), gp: a.gp }))
      .filter((e): e is LeaderEntry => e.value !== null && e.value > 0)
      .sort((a, b) => b.value - a.value || a.playerId - b.playerId)
      .slice(0, limit);
    if (entries.length > 0) boards.push({ category, entries });
  }
  return boards;
}
