import { describe, expect, it } from "vitest";
import { buildLiveGameSnapshot } from "@/lib/admin/live-game";
import type { Game, StatLine } from "@/types/domain";

const game: Game = {
  id: 9,
  seasonId: 1,
  roundNumber: 1,
  opponent: "Test",
  tipoffAt: "2026-01-01T18:00:00Z",
  location: null,
  homeAway: "home",
  status: "live",
  teamScore: 44,
  opponentScore: 40,
  recap: null,
  playerOfGameId: null,
  potgNote: null,
  playOfGameMediaId: null,
  isPublished: false,
  isPractice: false,
  isCup: false,
  excludeFromStats: false,
};

const line: StatLine = {
  gameId: 9,
  playerId: 3,
  points: 12,
  rebounds: 5,
  assists: 2,
  steals: 1,
  blocks: null,
  turnovers: 0,
  fouls: null,
  fgMade: null,
  fgAttempted: null,
  threeMade: null,
  threeAttempted: null,
  ftMade: null,
  ftAttempted: null,
};

describe("buildLiveGameSnapshot", () => {
  it("maps core live stats and null optional stats to zero", () => {
    const snapshot = buildLiveGameSnapshot(game, [line]);
    expect(snapshot.gameId).toBe(9);
    expect(snapshot.teamScore).toBe(44);
    expect(snapshot.lines[3]).toEqual({
      playerId: 3,
      points: 12,
      rebounds: 5,
      assists: 2,
      blocks: 0,
      turnovers: 0,
      steals: 1,
    });
  });
});
