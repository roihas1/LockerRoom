import { describe, expect, it } from "vitest";
import "@/lib/validation/he";
import { livePlayerStatLineSchema, saveLiveStatsSchema, parseLiveStatsPayload } from "@/lib/validation/live-stats";
import { zhe } from "@/lib/validation/he";

const baseLine = {
  playerId: 1,
  points: 10,
  rebounds: 4,
  assists: 2,
  turnovers: 1,
  steals: 0,
  blocks: 0,
};

describe("livePlayerStatLineSchema", () => {
  it("accepts non-negative core stats", () => {
    expect(livePlayerStatLineSchema.safeParse(baseLine).success).toBe(true);
  });

  it("rejects negative values in Hebrew", () => {
    const r = livePlayerStatLineSchema.safeParse({ ...baseLine, points: -1 });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.message === zhe.nonNegative)).toBe(true);
  });

  it("rejects values over the cap", () => {
    const r = livePlayerStatLineSchema.safeParse({ ...baseLine, rebounds: 1000 });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.message === zhe.tooLarge)).toBe(true);
  });
});

describe("saveLiveStatsSchema", () => {
  it("requires a line for every played player", () => {
    const r = saveLiveStatsSchema.safeParse({
      gameId: 1,
      playedPlayerIds: [1, 2],
      lines: [baseLine],
    });
    expect(r.success).toBe(false);
  });

  it("allows optional team and opponent scores", () => {
    const r = saveLiveStatsSchema.safeParse({
      gameId: 1,
      playedPlayerIds: [1],
      lines: [baseLine],
      teamScore: 72,
      opponentScore: 68,
    });
    expect(r.success).toBe(true);
  });
});

describe("parseLiveStatsPayload", () => {
  it("parses JSON objects", () => {
    const r = parseLiveStatsPayload({
      gameId: 5,
      playedPlayerIds: [1],
      lines: [baseLine],
      teamScore: 10,
      opponentScore: 8,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.gameId).toBe(5);
      expect(r.data.teamScore).toBe(10);
    }
  });

  it("parses FormData with playedPlayerIds and stat fields", () => {
    const fd = new FormData();
    fd.set("gameId", "3");
    fd.append("playedPlayerIds", "7");
    fd.set("points_7", "12");
    fd.set("rebounds_7", "0");
    fd.set("assists_7", "3");
    fd.set("turnovers_7", "1");
    fd.set("steals_7", "2");
    fd.set("blocks_7", "1");
    fd.set("teamScore", "55");
    fd.set("opponentScore", "50");

    const r = parseLiveStatsPayload(fd);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.lines[0]).toMatchObject({
        playerId: 7,
        points: 12,
        assists: 3,
        steals: 2,
        blocks: 1,
      });
      expect(r.data.teamScore).toBe(55);
      expect(r.data.opponentScore).toBe(50);
    }
  });
});
