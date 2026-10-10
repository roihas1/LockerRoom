import { describe, expect, it } from "vitest";
import type { StatLine } from "@/types/domain";
import { aggregateLines } from "./aggregate";
import { computeShameAwards } from "./shame";

const line = (over: Partial<StatLine>): StatLine => ({
  gameId: 1,
  playerId: 1,
  points: 0,
  rebounds: 0,
  assists: 0,
  steals: null,
  blocks: null,
  turnovers: null,
  fouls: null,
  fgMade: null,
  fgAttempted: null,
  threeMade: null,
  threeAttempted: null,
  ftMade: null,
  ftAttempted: null,
  ...over,
});

describe("computeShameAwards", () => {
  it("picks the lowest percentage and the highest per-game totals", () => {
    const aggs = [
      aggregateLines(1, [line({ playerId: 1, fgMade: 2, fgAttempted: 12, turnovers: 1, fouls: 4, threeMade: 0, threeAttempted: 6 })]),
      aggregateLines(2, [line({ playerId: 2, fgMade: 6, fgAttempted: 12, turnovers: 5, fouls: 1, threeMade: 1, threeAttempted: 2 })]),
    ];
    const byCategory = Object.fromEntries(computeShameAwards(aggs, 1).map((a) => [a.category, a.playerId]));
    expect(byCategory).toEqual({ bricks: 1, santa: 2, trigger: 1, fouls: 1 });
  });

  it("ignores percentages with too few attempts", () => {
    const aggs = [aggregateLines(1, [line({ fgMade: 0, fgAttempted: 3, ftMade: 0, ftAttempted: 2 })])];
    expect(computeShameAwards(aggs, 1)).toEqual([]);
  });

  it("does not award zero-value categories", () => {
    const aggs = [aggregateLines(1, [line({ turnovers: 0, fouls: 0, threeMade: 2, threeAttempted: 2 })])];
    expect(computeShameAwards(aggs, 1)).toEqual([]);
  });
});
