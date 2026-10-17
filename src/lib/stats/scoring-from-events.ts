import type { GameEvent } from "@/types/domain";

export interface ScoringFromEvents {
  /** Made free throws (+1 point events). */
  ft: number;
  /** Made two-pointers (+2). */
  two: number;
  /** Made threes (+3). */
  three: number;
}

export const emptyScoring = (): ScoringFromEvents => ({ ft: 0, two: 0, three: 0 });

function bumpScoring(cur: ScoringFromEvents, value: number): void {
  if (value === 1) cur.ft++;
  else if (value === 2) cur.two++;
  else if (value === 3) cur.three++;
}

function tallyScoring(events: Pick<GameEvent, "kind" | "value">[], kind: "points" | "opponent_points"): ScoringFromEvents {
  const out = emptyScoring();
  for (const e of events) {
    if (e.kind !== kind) continue;
    bumpScoring(out, e.value);
  }
  return out;
}

/**
 * Counts made FT / 2PT / 3PT from team `points` play-by-play events.
 * Only exact +1 / +2 / +3 values count (how live +1/+2/+3 buttons are logged).
 */
export function scoringFromEvents(events: Pick<GameEvent, "kind" | "value">[]): ScoringFromEvents {
  return tallyScoring(events, "points");
}

/** Same breakdown for `opponent_points` events. */
export function opponentScoringFromEvents(events: Pick<GameEvent, "kind" | "value">[]): ScoringFromEvents {
  return tallyScoring(events, "opponent_points");
}

/**
 * Per-player made FT / 2PT / 3PT from `points` events (requires `playerId`).
 * Players with no scoring buckets are omitted from the map.
 */
export function playerScoringFromEvents(
  events: Pick<GameEvent, "kind" | "value" | "playerId">[],
): Map<number, ScoringFromEvents> {
  const map = new Map<number, ScoringFromEvents>();
  for (const e of events) {
    if (e.kind !== "points" || e.playerId == null) continue;
    if (e.value !== 1 && e.value !== 2 && e.value !== 3) continue;
    const cur = map.get(e.playerId) ?? emptyScoring();
    bumpScoring(cur, e.value);
    map.set(e.playerId, cur);
  }
  return map;
}

/**
 * Per-game made FT / 2PT / 3PT for one player's `points` events.
 * Games with no scoring buckets are omitted from the map.
 */
export function scoringByGameFromEvents(
  events: Pick<GameEvent, "kind" | "value" | "gameId">[],
): Map<number, ScoringFromEvents> {
  const map = new Map<number, ScoringFromEvents>();
  for (const e of events) {
    if (e.kind !== "points") continue;
    if (e.value !== 1 && e.value !== 2 && e.value !== 3) continue;
    const cur = map.get(e.gameId) ?? emptyScoring();
    bumpScoring(cur, e.value);
    map.set(e.gameId, cur);
  }
  return map;
}

export function scoringTotal(scoring: Iterable<ScoringFromEvents>): ScoringFromEvents {
  const out = emptyScoring();
  for (const s of scoring) {
    out.ft += s.ft;
    out.two += s.two;
    out.three += s.three;
  }
  return out;
}

export function hasScoring(s: ScoringFromEvents): boolean {
  return s.ft + s.two + s.three > 0;
}
