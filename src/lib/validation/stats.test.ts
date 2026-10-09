import { describe, expect, it } from "vitest";
import "@/lib/validation/he";
import { playerStatLineSchema, saveGameStatsSchema } from "@/lib/validation/stats";
import { zhe } from "@/lib/validation/he";

describe("playerStatLineSchema", () => {
  it("rejects made greater than attempted in Hebrew", () => {
    const r = playerStatLineSchema.safeParse({
      playerId: 1,
      points: 10,
      rebounds: 2,
      assists: 1,
      steals: null,
      blocks: null,
      turnovers: null,
      fouls: null,
      fgMade: 5,
      fgAttempted: 3,
      threeMade: null,
      threeAttempted: null,
      ftMade: null,
      ftAttempted: null,
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.message === zhe.madeOverAttempted)).toBe(true);
  });

  it("rejects threes over field goals", () => {
    const r = playerStatLineSchema.safeParse({
      playerId: 1,
      points: 0,
      rebounds: 0,
      assists: 0,
      steals: null,
      blocks: null,
      turnovers: null,
      fouls: null,
      fgMade: 2,
      fgAttempted: 5,
      threeMade: 3,
      threeAttempted: 4,
      ftMade: null,
      ftAttempted: null,
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.message === zhe.threesOverFg)).toBe(true);
  });
});

describe("saveGameStatsSchema", () => {
  it("requires a line for every played player", () => {
    const r = saveGameStatsSchema.safeParse({
      gameId: 1,
      playedIds: [1, 2],
      lines: [{ playerId: 1, points: 0, rebounds: 0, assists: 0, steals: null, blocks: null, turnovers: null, fouls: null, fgMade: null, fgAttempted: null, threeMade: null, threeAttempted: null, ftMade: null, ftAttempted: null }],
    });
    expect(r.success).toBe(false);
  });
});
