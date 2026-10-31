import type { EventInsert, EventRemoval, GameEventKind, SnapshotDiff } from "./diff";
import { fieldToKind } from "./diff";
import type { LiveStatField } from "./types";

/** One scorer tap (or manual edit chunk) waiting to be written as play-by-play. */
export type PendingLiveEvent =
  | { id: string; op: "insert"; playerId: number | null; kind: GameEventKind; value: number }
  | { id: string; op: "remove"; playerId: number | null; kind: GameEventKind; amount: number };

export function pendingEventId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Break a points delta into basket-sized units (3 → 2 → 1). Used for manual score edits without a click log. */
export function decomposeScoringDelta(delta: number): number[] {
  let n = Math.abs(delta);
  const units: number[] = [];
  while (n >= 3) {
    units.push(3);
    n -= 3;
  }
  if (n >= 2) {
    units.push(2);
    n -= 2;
  }
  while (n >= 1) {
    units.push(1);
    n -= 1;
  }
  return units;
}

export function insertEvent(playerId: number | null, kind: GameEventKind, value: number): PendingLiveEvent {
  return { id: pendingEventId(), op: "insert", playerId, kind, value };
}

export function removeEvent(playerId: number | null, kind: GameEventKind, amount: number): PendingLiveEvent {
  return { id: pendingEventId(), op: "remove", playerId, kind, amount };
}

/** Record +N / −N on a counting stat (REB/AST/STL/BLK/TOV) as N separate value-1 events. */
export function eventsForCountingBump(playerId: number, field: Exclude<LiveStatField, "points">, delta: number): PendingLiveEvent[] {
  if (delta === 0) return [];
  const kind = fieldToKind[field];
  if (delta > 0) return Array.from({ length: delta }, () => insertEvent(playerId, kind, 1));
  return [removeEvent(playerId, kind, -delta)];
}

/** Record a points button tap (+1/+2/+3 or −1) as a single PBP event. */
export function eventsForPointsTap(playerId: number, delta: number): PendingLiveEvent[] {
  if (delta === 0) return [];
  if (delta > 0) return [insertEvent(playerId, "points", delta)];
  return [removeEvent(playerId, "points", -delta)];
}

/** Manual points edit (typed total): greedy basket split / one removal for the net drop. */
export function eventsForPointsEdit(playerId: number, delta: number): PendingLiveEvent[] {
  if (delta === 0) return [];
  if (delta > 0) return decomposeScoringDelta(delta).map((value) => insertEvent(playerId, "points", value));
  return [removeEvent(playerId, "points", -delta)];
}

export function eventsForOpponentTap(delta: number): PendingLiveEvent[] {
  if (delta === 0) return [];
  if (delta > 0) return [insertEvent(null, "opponent_points", delta)];
  return [removeEvent(null, "opponent_points", -delta)];
}

export function eventsForOpponentEdit(delta: number): PendingLiveEvent[] {
  if (delta === 0) return [];
  if (delta > 0) return decomposeScoringDelta(delta).map((value) => insertEvent(null, "opponent_points", value));
  return [removeEvent(null, "opponent_points", -delta)];
}

export function eventLogToDiff(log: PendingLiveEvent[]): Pick<SnapshotDiff, "inserts" | "removals"> {
  const inserts: EventInsert[] = [];
  const removals: EventRemoval[] = [];
  for (const e of log) {
    if (e.op === "insert") inserts.push({ playerId: e.playerId, kind: e.kind, value: e.value });
    else removals.push({ playerId: e.playerId, kind: e.kind, amount: e.amount });
  }
  return { inserts, removals };
}

/**
 * When the client sent no click log, still avoid lumped events: split counting-stat deltas into 1s and
 * points into 3/2/1 units so a rare log-less save matches the preferred PBP shape.
 */
export function splitSnapshotInserts(inserts: EventInsert[]): EventInsert[] {
  const out: EventInsert[] = [];
  for (const row of inserts) {
    if (row.kind === "points" || row.kind === "opponent_points") {
      for (const value of decomposeScoringDelta(row.value)) out.push({ ...row, value });
    } else if (row.value > 1) {
      for (let i = 0; i < row.value; i++) out.push({ ...row, value: 1 });
    } else {
      out.push(row);
    }
  }
  return out;
}

/**
 * Prefer the click log when the snapshot actually changed (so a retry after a successful save does not
 * re-apply the same taps). Always keep roster clears from the snapshot diff.
 */
export function mergeEventDiff(snap: SnapshotDiff, log: PendingLiveEvent[]): SnapshotDiff {
  const snapHasStatChange = snap.inserts.length > 0 || snap.removals.length > 0;
  if (log.length > 0 && snapHasStatChange) {
    const fromLog = eventLogToDiff(log);
    return { inserts: fromLog.inserts, removals: fromLog.removals, clearedPlayerIds: snap.clearedPlayerIds };
  }
  return {
    inserts: splitSnapshotInserts(snap.inserts),
    removals: snap.removals,
    clearedPlayerIds: snap.clearedPlayerIds,
  };
}
