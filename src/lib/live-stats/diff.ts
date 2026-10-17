import type { LivePlayerTotals, LiveStatField } from "./types";

export type GameEventKind = "points" | "rebound" | "assist" | "steal" | "block" | "turnover" | "opponent_points";

export interface EventInsert {
  playerId: number | null;
  kind: GameEventKind;
  value: number;
}

export interface EventRemoval {
  playerId: number | null;
  kind: GameEventKind;
  /** Total value to take back, newest events first. */
  amount: number;
}

export interface SnapshotDiff {
  inserts: EventInsert[];
  removals: EventRemoval[];
  /** Players taken off the sheet entirely; all their events go. */
  clearedPlayerIds: number[];
}

export const fieldToKind: Record<LiveStatField, GameEventKind> = {
  points: "points",
  rebounds: "rebound",
  assists: "assist",
  steals: "steal",
  blocks: "block",
  turnovers: "turnover",
};

const FIELDS = Object.keys(fieldToKind) as LiveStatField[];

/**
 * Turns two consecutive full live-stat snapshots into play-by-play changes. Increases become events,
 * decreases (undo or a corrected total) take back the newest matching events.
 */
export function diffSnapshots(
  prev: LivePlayerTotals[],
  next: LivePlayerTotals[],
  prevOpponentScore: number | null,
  nextOpponentScore: number | undefined,
): SnapshotDiff {
  const before = new Map(prev.map((r) => [r.playerId, r]));
  const nextIds = new Set(next.map((r) => r.playerId));
  const diff: SnapshotDiff = { inserts: [], removals: [], clearedPlayerIds: [] };

  for (const row of next) {
    const old = before.get(row.playerId);
    for (const field of FIELDS) {
      const delta = (row[field] ?? 0) - (old?.[field] ?? 0);
      const kind = fieldToKind[field];
      if (delta > 0) diff.inserts.push({ playerId: row.playerId, kind, value: delta });
      else if (delta < 0) diff.removals.push({ playerId: row.playerId, kind, amount: -delta });
    }
  }
  for (const old of prev) {
    if (!nextIds.has(old.playerId)) diff.clearedPlayerIds.push(old.playerId);
  }

  if (nextOpponentScore !== undefined) {
    const delta = nextOpponentScore - (prevOpponentScore ?? 0);
    if (delta > 0) diff.inserts.push({ playerId: null, kind: "opponent_points", value: delta });
    else if (delta < 0) diff.removals.push({ playerId: null, kind: "opponent_points", amount: -delta });
  }
  return diff;
}

/**
 * Which events to delete to take back `amount`, given matching events newest first. When the last
 * deleted event overshoots (an undo of 1 from a +3), the leftover is re-inserted so totals stay exact.
 */
export function planRemoval(eventsNewestFirst: { id: number; value: number }[], amount: number): { deleteIds: number[]; reinsert: number } {
  const deleteIds: number[] = [];
  let remaining = amount;
  for (const event of eventsNewestFirst) {
    if (remaining <= 0) break;
    deleteIds.push(event.id);
    remaining -= event.value;
  }
  return { deleteIds, reinsert: remaining < 0 ? -remaining : 0 };
}
