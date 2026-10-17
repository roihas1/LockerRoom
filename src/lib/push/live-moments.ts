export const LIVE_MOMENT_DEFICIT_THRESHOLD = 10;
export const LIVE_MOMENT_LEAD_THRESHOLD = 10;
export const LIVE_EXTRA_PUSH_MAX = 3;

export type LiveMomentKind = "comeback" | "lead";

export type LiveMomentState = {
  liveMaxDeficit: number;
  liveExtraPushCount: number;
  comebackSent: boolean;
  leadSent: boolean;
};

export type LiveMomentScores = {
  prevTeam: number | null;
  prevOpponent: number | null;
  nextTeam: number;
  nextOpponent: number;
};

export type LiveMomentDecision = {
  moment: LiveMomentKind | null;
  /** Updated max opponent lead to persist on the game row. */
  nextMaxDeficit: number;
};

function deficit(team: number, opponent: number): number {
  return Math.max(0, opponent - team);
}

function margin(team: number, opponent: number): number {
  return team - opponent;
}

/** Highest opponent lead across stored history and the prev/next score snapshots. */
export function nextLiveMaxDeficit(stored: number, scores: LiveMomentScores): number {
  let max = Math.max(0, stored);
  if (scores.prevTeam != null && scores.prevOpponent != null) {
    max = Math.max(max, deficit(scores.prevTeam, scores.prevOpponent));
  }
  max = Math.max(max, deficit(scores.nextTeam, scores.nextOpponent));
  return max;
}

/**
 * Picks at most one mid-game live push for this score save.
 * Comeback wins when both would fire; respects the per-game extra-push cap and once-each flags.
 */
export function detectLiveMoment(state: LiveMomentState, scores: LiveMomentScores): LiveMomentDecision {
  const nextMaxDeficit = nextLiveMaxDeficit(state.liveMaxDeficit, scores);
  const empty: LiveMomentDecision = { moment: null, nextMaxDeficit };

  if (state.liveExtraPushCount >= LIVE_EXTRA_PUSH_MAX) return empty;

  const prevTeam = scores.prevTeam;
  const prevOpponent = scores.prevOpponent;
  const { nextTeam, nextOpponent } = scores;

  const crossedIntoLead =
    nextTeam > nextOpponent &&
    (prevTeam == null || prevOpponent == null || prevTeam <= prevOpponent);

  const comeback =
    !state.comebackSent && nextMaxDeficit >= LIVE_MOMENT_DEFICIT_THRESHOLD && crossedIntoLead;

  const prevMargin = prevTeam != null && prevOpponent != null ? margin(prevTeam, prevOpponent) : Number.NEGATIVE_INFINITY;
  const nextMargin = margin(nextTeam, nextOpponent);
  const lead =
    !state.leadSent && prevMargin < LIVE_MOMENT_LEAD_THRESHOLD && nextMargin >= LIVE_MOMENT_LEAD_THRESHOLD;

  if (comeback) return { moment: "comeback", nextMaxDeficit };
  if (lead) return { moment: "lead", nextMaxDeficit };
  return empty;
}
