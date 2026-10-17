import { describe, expect, it } from "vitest";
import { opponentScoringFromEvents, scoringFromEvents } from "./scoring-from-events";

const sample = [
  { kind: "points" as const, value: 1 },
  { kind: "points" as const, value: 2 },
  { kind: "points" as const, value: 2 },
  { kind: "points" as const, value: 3 },
  { kind: "opponent_points" as const, value: 1 },
  { kind: "opponent_points" as const, value: 3 },
  { kind: "opponent_points" as const, value: 3 },
  { kind: "rebound" as const, value: 1 },
  { kind: "points" as const, value: 5 },
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
