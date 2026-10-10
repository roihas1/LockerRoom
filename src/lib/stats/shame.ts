import type { PlayerAggregate } from "./aggregate";
import { minGamesForLeaders } from "./leaders";

export type ShameCategory = "bricks" | "santa" | "trigger" | "fouls" | "freeThrows";

export interface ShameAward {
  category: ShameCategory;
  playerId: number;
  value: number;
}

export const shameCategories: ShameCategory[] = ["bricks", "santa", "trigger", "fouls", "freeThrows"];

/** Below these, a bad percentage is bad luck rather than a trend. */
const MIN_FG_ATTEMPTS = 10;
const MIN_FT_ATTEMPTS = 5;

/** Lower is "better" for percentage categories, higher for the rest. */
function scoreFor(agg: PlayerAggregate, category: ShameCategory): number | null {
  switch (category) {
    case "bricks":
      return agg.fg.attempted >= MIN_FG_ATTEMPTS ? agg.fg.pct : null;
    case "freeThrows":
      return agg.ft.attempted >= MIN_FT_ATTEMPTS ? agg.ft.pct : null;
    case "santa":
      return agg.turnovers.perGame;
    case "fouls":
      return agg.fouls.perGame;
    case "trigger":
      return agg.three.games > 0 ? agg.three.attempted - agg.three.made : null;
  }
}

const lowestWins = new Set<ShameCategory>(["bricks", "freeThrows"]);

/** One "winner" per category. Categories without enough recorded data are dropped. */
export function computeShameAwards(aggregates: PlayerAggregate[], completedGames: number): ShameAward[] {
  const minGp = minGamesForLeaders(completedGames);
  const awards: ShameAward[] = [];
  for (const category of shameCategories) {
    const lowest = lowestWins.has(category);
    const best = aggregates
      .filter((a) => a.gp >= minGp)
      .map((a) => ({ playerId: a.playerId, value: scoreFor(a, category) }))
      .filter((e): e is { playerId: number; value: number } => e.value !== null && (lowest || e.value > 0))
      .sort((a, b) => (lowest ? a.value - b.value : b.value - a.value) || a.playerId - b.playerId)[0];
    if (best) awards.push({ category, ...best });
  }
  return awards;
}
