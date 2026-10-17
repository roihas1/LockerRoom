import { describe, expect, it } from "vitest";
import {
  hasScoring,
  opponentScoringFromEvents,
  playerScoringFromEvents,
  scoringByGameFromEvents,
  scoringFromEvents,
  scoringTotal,
} from "./scoring-from-events";

const sample = [
  { kind: "points" as const, value: 1, playerId: 1 },
  { kind: "points" as const, value: 2, playerId: 1 },
  { kind: "points" as const, value: 2, playerId: 2 },
  { kind: "points" as const, value: 3, playerId: 2 },
  { kind: "opponent_points" as const, value: 1, playerId: null },
  { kind: "opponent_points" as const, value: 3, playerId: null },
  { kind: "opponent_points" as const, value: 3, playerId: null },
  { kind: "rebound" as const, value: 1, playerId: 1 },
  { kind: "points" as const, value: 5, playerId: 1 },
];

describe("scoringFromEvents", () => {
  it("counts only team points events of 1, 2, and 3", () => {
    expect(scoringFromEvents(sample)).toEqual({ ft: 1, two: 2, three: 1 });
  });

  it("returns zeros when there are no scoring events", () => {
    expect(scoringFromEvents([{ kind: "assist", value: 1 }])).toEqual({ ft: 0, two: 0, three: 0 });
  });
});

describe("opponentScoringFromEvents", () => {
  it("counts only opponent points events of 1, 2, and 3", () => {
    expect(opponentScoringFromEvents(sample)).toEqual({ ft: 1, two: 0, three: 2 });
  });
});

describe("playerScoringFromEvents", () => {
  it("groups made FT / 2PT / 3PT by playerId", () => {
    const byPlayer = playerScoringFromEvents(sample);
    expect(byPlayer.get(1)).toEqual({ ft: 1, two: 1, three: 0 });
    expect(byPlayer.get(2)).toEqual({ ft: 0, two: 1, three: 1 });
    expect(byPlayer.has(3)).toBe(false);
  });

  it("ignores points events without a player", () => {
    expect(playerScoringFromEvents([{ kind: "points", value: 2, playerId: null }]).size).toBe(0);
  });
});

describe("scoringTotal / hasScoring", () => {
  it("sums per-player buckets and detects non-zero scoring", () => {
    const byPlayer = playerScoringFromEvents(sample);
    expect(scoringTotal(byPlayer.values())).toEqual({ ft: 1, two: 2, three: 1 });
    expect(hasScoring(byPlayer.get(1)!)).toBe(true);
    expect(hasScoring({ ft: 0, two: 0, three: 0 })).toBe(false);
  });
});

describe("scoringByGameFromEvents", () => {
  it("groups one player's makes by gameId", () => {
    const byGame = scoringByGameFromEvents([
      { kind: "points", value: 1, gameId: 10 },
      { kind: "points", value: 2, gameId: 10 },
      { kind: "points", value: 3, gameId: 11 },
      { kind: "assist", value: 1, gameId: 10 },
    ]);
    expect(byGame.get(10)).toEqual({ ft: 1, two: 1, three: 0 });
    expect(byGame.get(11)).toEqual({ ft: 0, two: 0, three: 1 });
  });
});
