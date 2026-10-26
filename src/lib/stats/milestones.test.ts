import { describe, expect, it } from "vitest";
import type { Game, StatLine } from "@/types/domain";
import { detectMilestones } from "./milestones";

const game = (id: number, day: number, teamScore: number, opponentScore: number, over: Partial<Game> = {}): Game => ({
  id,
  seasonId: 1,
  roundNumber: id,
  opponent: `Opp ${id}`,
  tipoffAt: `2026-10-${String(day).padStart(2, "0")}T18:00:00Z`,
  location: null,
  homeAway: "home",
  status: "final",
  teamScore,
  opponentScore,
  recap: null,
  playerOfGameId: null,
  potgNote: null,
  playOfGameMediaId: null,
  isPublished: true,
  isPractice: false,
  isCup: false,
  ...over,
});

const line = (gameId: number, playerId: number, over: Partial<StatLine> = {}): StatLine => ({
  gameId,
  playerId,
  points: 0,
  rebounds: 0,
  assists: 0,
  steals: 0,
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

describe("detectMilestones", () => {
  it("detects a season total threshold crossed in this game", () => {
    const games = [game(1, 1, 60, 50), game(2, 2, 55, 70)];
    const lines = [line(1, 7, { points: 40 }), line(2, 7, { points: 12 })];
    const result = detectMilestones({ seasonId: 1, gameId: 2, games, lines });
    expect(result).toContainEqual({ kind: "season_total", key: "season:1:player:7:points:50", playerId: 7, stat: "points", value: 50 });
  });

  it("reports only the highest threshold when several are crossed at once", () => {
    const games = [game(1, 1, 60, 50), game(2, 2, 55, 70)];
    const lines = [line(1, 7, { points: 45 }), line(2, 7, { points: 60 })];
    const totals = detectMilestones({ seasonId: 1, gameId: 2, games, lines }).filter((m) => m.kind === "season_total");
    expect(totals).toEqual([{ kind: "season_total", key: "season:1:player:7:points:100", playerId: 7, stat: "points", value: 100 }]);
  });

  it("ignores games that are not the latest counted game", () => {
    const games = [game(1, 1, 60, 50), game(2, 2, 55, 70)];
    const lines = [line(1, 7, { points: 55 })];
    expect(detectMilestones({ seasonId: 1, gameId: 1, games, lines })).toEqual([]);
  });

  it("ignores unpublished or unfinished games", () => {
    const games = [game(1, 1, 60, 50, { isPublished: false })];
    expect(detectMilestones({ seasonId: 1, gameId: 1, games, lines: [line(1, 7, { points: 60 })] })).toEqual([]);
  });

  it("needs history before posting season highs and team records", () => {
    const games = [game(1, 1, 90, 50)];
    const result = detectMilestones({ seasonId: 1, gameId: 1, games, lines: [line(1, 7, { points: 30 })] });
    expect(result.some((m) => m.kind === "season_high" || m.kind === "team_points")).toBe(false);
  });

  it("detects a new single-game season high and team points record", () => {
    const games = [game(1, 1, 60, 50), game(2, 2, 62, 50), game(3, 3, 80, 60)];
    const lines = [line(1, 7, { points: 14 }), line(2, 8, { points: 16 }), line(3, 9, { points: 22, threeMade: 4 })];
    const result = detectMilestones({ seasonId: 1, gameId: 3, games, lines });
    expect(result).toContainEqual({ kind: "season_high", key: "season:1:high:points:game:3", playerId: 9, stat: "points", value: 22 });
    expect(result).toContainEqual({ kind: "season_high", key: "season:1:high:threes:game:3", playerId: 9, stat: "threes", value: 4 });
    expect(result).toContainEqual({ kind: "team_points", key: "season:1:team-points:game:3", value: 80 });
  });

  it("does not count a tie with the previous high or a value under the minimum", () => {
    const games = [game(1, 1, 60, 50), game(2, 2, 62, 50), game(3, 3, 50, 60)];
    const lines = [line(1, 7, { points: 20 }), line(3, 9, { points: 20, rebounds: 5 })];
    const result = detectMilestones({ seasonId: 1, gameId: 3, games, lines });
    expect(result.some((m) => m.kind === "season_high")).toBe(false);
  });

  it("celebrates win streak marks", () => {
    const games = [game(1, 1, 50, 60), game(2, 2, 60, 50), game(3, 3, 61, 50), game(4, 4, 62, 50)];
    const result = detectMilestones({ seasonId: 1, gameId: 4, games, lines: [] });
    expect(result).toContainEqual({ kind: "win_streak", key: "season:1:win-streak:3:game:4", count: 3 });
  });
});
