import { describe, expect, it } from "vitest";
import { diffSnapshots, planRemoval } from "./diff";
import type { LivePlayerTotals } from "./types";

const line = (playerId: number, over: Partial<LivePlayerTotals> = {}): LivePlayerTotals => ({
  playerId,
  points: 0,
  rebounds: 0,
  assists: 0,
  turnovers: 0,
  steals: 0,
  ...over,
});

describe("diffSnapshots", () => {
  it("returns nothing when nothing changed", () => {
    const rows = [line(1, { points: 4 })];
    expect(diffSnapshots(rows, rows, 10, 10)).toEqual({ inserts: [], removals: [], clearedPlayerIds: [] });
  });

  it("turns increases into events", () => {
    const diff = diffSnapshots([line(1)], [line(1, { points: 2, rebounds: 1 })], 0, 3);
    expect(diff.inserts).toEqual([
      { playerId: 1, kind: "points", value: 2 },
      { playerId: 1, kind: "rebound", value: 1 },
      { playerId: null, kind: "opponent_points", value: 3 },
    ]);
    expect(diff.removals).toEqual([]);
  });

  it("treats a new player as starting from zero", () => {
    const diff = diffSnapshots([], [line(7, { assists: 1 })], null, undefined);
    expect(diff.inserts).toEqual([{ playerId: 7, kind: "assist", value: 1 }]);
  });

  it("turns decreases (undo) into removals", () => {
    const diff = diffSnapshots([line(1, { points: 5, steals: 1 })], [line(1, { points: 3, steals: 0 })], 12, 10);
    expect(diff.removals).toEqual([
      { playerId: 1, kind: "points", amount: 2 },
      { playerId: 1, kind: "steal", amount: 1 },
      { playerId: null, kind: "opponent_points", amount: 2 },
    ]);
    expect(diff.inserts).toEqual([]);
  });

  it("clears players removed from the sheet", () => {
    const diff = diffSnapshots([line(1, { points: 2 }), line(2)], [line(2)], null, undefined);
    expect(diff.clearedPlayerIds).toEqual([1]);
  });

  it("ignores the opponent score when it was not sent", () => {
    const diff = diffSnapshots([line(1)], [line(1)], 20, undefined);
    expect(diff.inserts).toEqual([]);
    expect(diff.removals).toEqual([]);
  });
});

describe("planRemoval", () => {
  it("deletes the newest events covering the amount exactly", () => {
    expect(planRemoval([{ id: 9, value: 2 }, { id: 8, value: 3 }], 2)).toEqual({ deleteIds: [9], reinsert: 0 });
    expect(planRemoval([{ id: 9, value: 2 }, { id: 8, value: 3 }], 5)).toEqual({ deleteIds: [9, 8], reinsert: 0 });
  });

  it("re-inserts the leftover when an event overshoots", () => {
    expect(planRemoval([{ id: 9, value: 3 }], 1)).toEqual({ deleteIds: [9], reinsert: 2 });
  });

  it("stops when there are no more events", () => {
    expect(planRemoval([{ id: 1, value: 1 }], 4)).toEqual({ deleteIds: [1], reinsert: 0 });
    expect(planRemoval([], 2)).toEqual({ deleteIds: [], reinsert: 0 });
  });
});
