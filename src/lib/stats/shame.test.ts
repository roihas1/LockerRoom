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
    expect(byCategory).toEqual({ bricks: 1, santa: 2, trigger: 1, fouls: 1, blackHole: 1, ghost: 1 });
  });

  it("ignores percentages with too few attempts", () => {
    const aggs = [aggregateLines(1, [line({ fgMade: 0, fgAttempted: 3, ftMade: 0, ftAttempted: 2, threeMade: 0, threeAttempted: 4 })])];
    const categories = computeShameAwards(aggs, 1).map((a) => a.category);
    expect(categories).not.toContain("bricks");
    expect(categories).not.toContain("freeThrows");
    expect(categories).not.toContain("airball");
  });

  it("does not award zero-value categories", () => {
    const aggs = [aggregateLines(1, [line({ turnovers: 0, fouls: 0, threeMade: 2, threeAttempted: 2 })])];
    expect(computeShameAwards(aggs, 1).map((a) => a.category)).toEqual(["ghost"]);
  });

  it("finds the black hole by shots per assist", () => {
    const aggs = [
      aggregateLines(1, [line({ playerId: 1, fgMade: 5, fgAttempted: 20, assists: 0 })]),
      aggregateLines(2, [line({ playerId: 2, fgMade: 5, fgAttempted: 20, assists: 5 })]),
    ];
    const award = computeShameAwards(aggs, 1).find((a) => a.category === "blackHole");
    expect(award).toEqual({ category: "blackHole", playerId: 1, value: 20 });
  });

  it("crowns the worst three point shooter with enough attempts", () => {
    const aggs = [
      aggregateLines(1, [line({ playerId: 1, threeMade: 1, threeAttempted: 12 })]),
      aggregateLines(2, [line({ playerId: 2, threeMade: 0, threeAttempted: 5 })]),
    ];
    expect(computeShameAwards(aggs, 1).find((a) => a.category === "airball")?.playerId).toBe(1);
  });

  it("names the ghost with the least production per game", () => {
    const aggs = [
      aggregateLines(1, [line({ playerId: 1, points: 10 })]),
      aggregateLines(2, [line({ playerId: 2, points: 1, rebounds: 1 })]),
    ];
    expect(computeShameAwards(aggs, 1).find((a) => a.category === "ghost")).toEqual({ category: "ghost", playerId: 2, value: 2 });
  });

  it("counts games ending with five fouls only when lines are provided", () => {
    const lines = [
      line({ playerId: 1, gameId: 1, fouls: 5 }),
      line({ playerId: 1, gameId: 2, fouls: 6 }),
      line({ playerId: 2, gameId: 1, fouls: 5 }),
      line({ playerId: 2, gameId: 2, fouls: 2 }),
    ];
    const aggs = [aggregateLines(1, lines.slice(0, 2)), aggregateLines(2, lines.slice(2))];
    expect(computeShameAwards(aggs, 2, lines).find((a) => a.category === "fouledOut")).toEqual({ category: "fouledOut", playerId: 1, value: 2 });
    expect(computeShameAwards(aggs, 2).find((a) => a.category === "fouledOut")).toBeUndefined();
  });
});
