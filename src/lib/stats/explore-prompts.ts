import type { Game, StatLine } from "@/types/domain";
import type { PlayerAggregate } from "./aggregate";
import type { MilestoneStat } from "./milestones";
import { seasonTotalThresholds } from "./milestones";
import { computePir } from "./pir";

export type ExplorePromptId = "hot" | "glass" | "pirNights" | "shame" | "milestones";

export const explorePromptIds: ExplorePromptId[] = ["hot", "glass", "pirNights", "shame", "milestones"];

export const milestoneStatOrder: MilestoneStat[] = ["points", "rebounds", "assists", "threes", "steals", "blocks"];

export interface PirNight {
  gameId: number;
  playerId: number;
  opponent: string;
  tipoffAt: string;
  pir: number;
  points: number;
  rebounds: number;
  assists: number;
}

export interface MilestoneProgress {
  playerId: number;
  stat: MilestoneStat;
  current: number;
  next: number;
  /** 0–1 toward the next threshold. */
  progress: number;
}

/** One season-total track: earned thresholds (= balls) + optional next target. */
export interface MilestoneTrack {
  stat: MilestoneStat;
  current: number;
  thresholds: number[];
  earned: number[];
  next: number | null;
  progress: number | null;
}

export interface MilestoneBallLeader {
  playerId: number;
  balls: number;
  next: MilestoneProgress | null;
}

const STAT_TOTAL: Record<MilestoneStat, (a: PlayerAggregate) => number> = {
  points: (a) => a.points,
  rebounds: (a) => a.rebounds,
  assists: (a) => a.assists,
  steals: (a) => a.steals.sum,
  blocks: (a) => a.blocks.sum,
  threes: (a) => a.three.made,
};

/** How many milestone balls exist across all season-total thresholds. */
export function totalMilestoneBallsAvailable(): number {
  return milestoneStatOrder.reduce((n, stat) => n + seasonTotalThresholds[stat].length, 0);
}

/** Per-stat tracks for one player — the lean “what exists / what I earned” view. */
export function milestoneTracksForAggregate(agg: PlayerAggregate): MilestoneTrack[] {
  return milestoneStatOrder.map((stat) => {
    const current = STAT_TOTAL[stat](agg);
    const thresholds = seasonTotalThresholds[stat];
    const earned = thresholds.filter((t) => current >= t);
    const next = thresholds.find((t) => t > current) ?? null;
    return {
      stat,
      current,
      thresholds,
      earned,
      next,
      progress: next === null ? null : current / next,
    };
  });
}

export function milestoneBallCount(agg: PlayerAggregate): number {
  return milestoneTracksForAggregate(agg).reduce((n, t) => n + t.earned.length, 0);
}

/**
 * Season competition: most balls first.
 * Pass `ensurePlayerIds` (e.g. active roster) so players without counted lines still appear at 0.
 */
export function milestoneBallLeaders(
  aggregates: PlayerAggregate[],
  { limit, ensurePlayerIds = [] }: { limit?: number; ensurePlayerIds?: number[] } = {},
): MilestoneBallLeader[] {
  const byId = new Map(
    aggregates.map((a) => [
      a.playerId,
      {
        playerId: a.playerId,
        balls: milestoneBallCount(a),
        next: nextMilestoneForAggregate(a),
      } satisfies MilestoneBallLeader,
    ]),
  );
  for (const id of ensurePlayerIds) {
    if (!byId.has(id)) byId.set(id, { playerId: id, balls: 0, next: null });
  }
  const ranked = [...byId.values()].sort(
    (a, b) => b.balls - a.balls || (b.next?.progress ?? 0) - (a.next?.progress ?? 0) || a.playerId - b.playerId,
  );
  return limit === undefined ? ranked : ranked.slice(0, limit);
}

/** Individual box-score lines with the highest PIR this season. */
export function topPirNights(games: Game[], lines: StatLine[], limit = 5): PirNight[] {
  const byId = new Map(games.map((g) => [g.id, g]));
  return [...lines]
    .map((l) => {
      const game = byId.get(l.gameId);
      if (!game) return null;
      return {
        gameId: l.gameId,
        playerId: l.playerId,
        opponent: game.opponent,
        tipoffAt: game.tipoffAt,
        pir: computePir(l),
        points: l.points,
        rebounds: l.rebounds,
        assists: l.assists,
      } satisfies PirNight;
    })
    .filter((x): x is PirNight => x !== null && x.pir > 0)
    .sort((a, b) => b.pir - a.pir || b.points - a.points || a.playerId - b.playerId)
    .slice(0, limit);
}

/** Closest unfinished season-total threshold for one player, or null if none. */
export function nextMilestoneForAggregate(agg: PlayerAggregate): MilestoneProgress | null {
  let best: MilestoneProgress | null = null;
  for (const stat of Object.keys(STAT_TOTAL) as MilestoneStat[]) {
    const current = STAT_TOTAL[stat](agg);
    if (current <= 0) continue;
    const next = seasonTotalThresholds[stat].find((t) => t > current);
    if (next === undefined) continue;
    const item: MilestoneProgress = {
      playerId: agg.playerId,
      stat,
      current,
      next,
      progress: current / next,
    };
    if (!best || item.progress > best.progress || (item.progress === best.progress && item.current > best.current)) {
      best = item;
    }
  }
  return best;
}

/**
 * Players closest to their next season-total threshold (points / boards / etc.).
 * Sorted by progress descending so “almost there” floats up.
 */
export function nearestMilestoneProgress(aggregates: PlayerAggregate[], limit = 6): MilestoneProgress[] {
  return aggregates
    .map(nextMilestoneForAggregate)
    .filter((x): x is MilestoneProgress => x !== null)
    .sort((a, b) => b.progress - a.progress || b.current - a.current || a.playerId - b.playerId)
    .slice(0, limit);
}
