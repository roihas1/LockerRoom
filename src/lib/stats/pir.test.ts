import { describe, expect, it } from "vitest";
import type { StatLine } from "@/types/domain";
import { comparePirLines, computePir, pickPotgPlayerId } from "./pir";

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

describe("computePir", () => {
  it("sums positives and subtracts turnovers, treating nulls as zero", () => {
    expect(computePir(line({ points: 10, rebounds: 5, assists: 3, steals: 2, blocks: 1, turnovers: 4 }))).toBe(17);
    expect(computePir(line({ points: 8, rebounds: 2, assists: 1 }))).toBe(11);
  });
});

describe("pickPotgPlayerId", () => {
  it("picks the highest PIR and breaks ties by points then assists then rebounds then fewer TO", () => {
    const a = line({ playerId: 1, points: 12, rebounds: 4, assists: 2, turnovers: 1 }); // PIR 17
    const b = line({ playerId: 2, points: 10, rebounds: 5, assists: 2, turnovers: 0 }); // PIR 17, fewer pts
    const c = line({ playerId: 3, points: 12, rebounds: 3, assists: 3, turnovers: 1 }); // PIR 17, more ast
    expect(pickPotgPlayerId([a, b, c])).toBe(3);
  });

  it("returns null for an empty list", () => {
    expect(pickPotgPlayerId([])).toBeNull();
  });
});

describe("comparePirLines", () => {
  it("is stable for equal lines by playerId", () => {
    const a = line({ playerId: 2, points: 5 });
    const b = line({ playerId: 1, points: 5 });
    expect(comparePirLines(a, b)).toBeGreaterThan(0);
  });
});
