import type { StatLine } from "@/types/domain";
import type { PlayerAggregate } from "./aggregate";
import { minGamesForLeaders } from "./leaders";

export type ShameCategory = "bricks" | "santa" | "trigger" | "fouls" | "freeThrows" | "blackHole" | "airball" | "ghost" | "fouledOut";

export interface ShameAward {
  category: ShameCategory;
  playerId: number;
  value: number;
}

export const shameCategories: ShameCategory[] = ["bricks", "santa", "trigger", "fouls", "freeThrows", "blackHole", "airball", "ghost", "fouledOut"];

export const shameEmoji: Record<ShameCategory, string> = {
  bricks: "🧱",
  santa: "🎁",
  trigger: "🔫",
  fouls: "🟨",
  freeThrows: "🫣",
  blackHole: "🕳️",
  airball: "🌬️",
  ghost: "👻",
  fouledOut: "🪑",
};

/** Below these, a bad percentage is bad luck rather than a trend. */
const MIN_FG_ATTEMPTS = 10;
const MIN_FT_ATTEMPTS = 5;
const MIN_THREE_ATTEMPTS = 10;
export const FOUL_OUT_LIMIT = 5;

/** Number of games in which each player reached the foul limit. */
export function foulOutCounts(lines: StatLine[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const l of lines) {
    if ((l.fouls ?? 0) >= FOUL_OUT_LIMIT) counts.set(l.playerId, (counts.get(l.playerId) ?? 0) + 1);
  }
  return counts;
}

/** Lower is "better" for percentage categories, higher for the rest. */
function scoreFor(agg: PlayerAggregate, category: ShameCategory, foulOuts: Map<number, number>): number | null {
  switch (category) {
    case "bricks":
      return agg.fg.attempted >= MIN_FG_ATTEMPTS ? agg.fg.pct : null;
    case "freeThrows":
      return agg.ft.attempted >= MIN_FT_ATTEMPTS ? agg.ft.pct : null;
    case "airball":
      return agg.three.attempted >= MIN_THREE_ATTEMPTS ? agg.three.pct : null;
    case "santa":
      return agg.turnovers.perGame;
    case "fouls":
      return agg.fouls.perGame;
    case "trigger":
      return agg.three.games > 0 ? agg.three.attempted - agg.three.made : null;
    case "blackHole":
      return agg.fg.attempted >= MIN_FG_ATTEMPTS ? agg.fg.attempted / Math.max(agg.assists, 1) : null;
    case "ghost":
      return agg.gp > 0 ? (agg.points + agg.rebounds + agg.assists) / agg.gp : null;
    case "fouledOut":
      return foulOuts.get(agg.playerId) ?? 0;
  }
}

const lowestWins = new Set<ShameCategory>(["bricks", "freeThrows", "airball", "ghost"]);

/**
 * One "winner" per category. Categories without enough recorded data are dropped.
 * `lines` is only needed for per-game categories (fouling out); without it they are skipped.
 */
export function computeShameAwards(aggregates: PlayerAggregate[], completedGames: number, lines: StatLine[] = []): ShameAward[] {
  const minGp = minGamesForLeaders(completedGames);
  const foulOuts = foulOutCounts(lines);
  const awards: ShameAward[] = [];
  for (const category of shameCategories) {
    const lowest = lowestWins.has(category);
    const best = aggregates
      .filter((a) => a.gp >= minGp)
      .map((a) => ({ playerId: a.playerId, value: scoreFor(a, category, foulOuts) }))
      .filter((e): e is { playerId: number; value: number } => e.value !== null && (lowest || e.value > 0))
      .sort((a, b) => (lowest ? a.value - b.value : b.value - a.value) || a.playerId - b.playerId)[0];
    if (best) awards.push({ category, ...best });
  }
  return awards;
}
