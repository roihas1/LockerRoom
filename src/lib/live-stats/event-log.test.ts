import { describe, expect, it } from "vitest";
import {
  decomposeScoringDelta,
  eventsForCountingBump,
  eventsForOpponentTap,
  eventsForPointsEdit,
  eventsForPointsTap,
  mergeEventDiff,
  splitSnapshotInserts,
} from "./event-log";
import type { SnapshotDiff } from "./diff";

const emptySnap = (): SnapshotDiff => ({ inserts: [], removals: [], clearedPlayerIds: [] });

describe("decomposeScoringDelta", () => {
  it("splits into 3s then 2s then 1s", () => {
    expect(decomposeScoringDelta(6)).toEqual([3, 3]);
    expect(decomposeScoringDelta(5)).toEqual([3, 2]);
    expect(decomposeScoringDelta(4)).toEqual([3, 1]);
    expect(decomposeScoringDelta(2)).toEqual([2]);
  });
});

describe("click helpers", () => {
  it("records each turnover tap as its own value-1 insert", () => {
    const once = eventsForCountingBump(5, "turnovers", 1);
    expect(once).toHaveLength(1);
    expect(once[0]).toMatchObject({ op: "insert", kind: "turnover", value: 1, playerId: 5 });

    const three = eventsForCountingBump(5, "turnovers", 3);
    expect(three).toHaveLength(3);
    expect(three.every((e) => e.op === "insert" && e.value === 1)).toBe(true);
  });

  it("keeps +3 taps as value 3 (not lumped later)", () => {
    const a = eventsForPointsTap(1, 3);
    const b = eventsForPointsTap(1, 3);
    expect(a[0]).toMatchObject({ op: "insert", kind: "points", value: 3 });
    expect(b[0]).toMatchObject({ op: "insert", kind: "points", value: 3 });
  });

  it("greedily splits a typed points edit of +6 into two threes", () => {
    const events = eventsForPointsEdit(1, 6);
    expect(events.map((e) => (e.op === "insert" ? e.value : null))).toEqual([3, 3]);
  });

  it("records opponent +2 as one basket event", () => {
    expect(eventsForOpponentTap(2)[0]).toMatchObject({ op: "insert", kind: "opponent_points", value: 2, playerId: null });
  });
});

describe("mergeEventDiff", () => {
  it("uses the click log when the snapshot changed", () => {
    const snap: SnapshotDiff = {
      inserts: [{ playerId: 1, kind: "turnover", value: 3 }],
      removals: [],
      clearedPlayerIds: [9],
    };
    const log = [
      ...eventsForCountingBump(1, "turnovers", 1),
      ...eventsForCountingBump(1, "turnovers", 1),
      ...eventsForCountingBump(1, "turnovers", 1),
    ];
    const merged = mergeEventDiff(snap, log);
    expect(merged.inserts).toHaveLength(3);
    expect(merged.inserts.every((i) => i.value === 1)).toBe(true);
    expect(merged.clearedPlayerIds).toEqual([9]);
  });

  it("ignores the click log on retry when the snapshot is already up to date", () => {
    const log = eventsForPointsTap(1, 3);
    const merged = mergeEventDiff(emptySnap(), log);
    expect(merged.inserts).toEqual([]);
  });

  it("falls back to splitting snapshot inserts when there is no log", () => {
    const snap: SnapshotDiff = {
      inserts: [
        { playerId: 1, kind: "points", value: 6 },
        { playerId: 1, kind: "turnover", value: 2 },
      ],
      removals: [],
      clearedPlayerIds: [],
    };
    expect(splitSnapshotInserts(snap.inserts)).toEqual([
      { playerId: 1, kind: "points", value: 3 },
      { playerId: 1, kind: "points", value: 3 },
      { playerId: 1, kind: "turnover", value: 1 },
      { playerId: 1, kind: "turnover", value: 1 },
    ]);
    expect(mergeEventDiff(snap, []).inserts).toHaveLength(4);
  });
});
