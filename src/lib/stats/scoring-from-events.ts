import type { GameEvent } from "@/types/domain";

export interface ScoringFromEvents {
  /** Made free throws (+1 point events). */
  ft: number;
  /** Made two-pointers (+2). */
  two: number;
  /** Made threes (+3). */
  three: number;
}

function tallyScoring(events: Pick<GameEvent, "kind" | "value">[], kind: "points" | "opponent_points"): ScoringFromEvents {
  let ft = 0;
  let two = 0;
  let three = 0;
  for (const e of events) {
    if (e.kind !== kind) continue;
    if (e.value === 1) ft++;
    else if (e.value === 2) two++;
    else if (e.value === 3) three++;
  }
  return { ft, two, three };
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
