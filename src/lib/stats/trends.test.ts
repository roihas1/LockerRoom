import { describe, expect, it } from "vitest";
import type { Game, StatLine } from "@/types/domain";
import {
  buildPlayerTrend,
  buildTeamTrend,
  computeHotPlayer,
  HOT_PLAYER_MIN_APPEARANCES,
  HOT_PLAYER_WINDOW,
  metricValue,
  rollingMetricValue,
  TREND_WINDOW,
} from "./trends";

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

const game = (over: Partial<Game>): Game => ({
  id: 1,
  seasonId: 1,
  roundNumber: 1,
  opponent: "יריבה",
  tipoffAt: "2026-09-01T17:00:00.000Z",
  location: null,
  homeAway: "home",
  status: "final",
  teamScore: 80,
  opponentScore: 70,
  recap: null,
  playerOfGameId: null,
  potgNote: null,
  playOfGameMediaId: null,
  isPublished: true,
  isPractice: false,
  ...over,
});

function season(n: number): { games: Game[]; lines: StatLine[] } {
  const games = Array.from({ length: n }, (_, i) =>
    game({
      id: i + 1,
      tipoffAt: `2026-09-${String(i + 1).padStart(2, "0")}T17:00:00.000Z`,
      opponent: `יריבה ${i + 1}`,
      teamScore: 70 + i,
      opponentScore: 65,
    }),
  );
  return { games, lines: [] };
}

describe("computeHotPlayer", () => {
  it("returns null when fewer than min appearances exist across the window", () => {
    const { games } = season(1);
    const lines = [line({ gameId: 1, playerId: 1, points: 20 })];
    expect(computeHotPlayer(games, lines)).toBeNull();
  });

  it("requires HOT_PLAYER_MIN_APPEARANCES appearances in the recent window", () => {
    const { games } = season(3);
    const lines = [
      line({ gameId: 1, playerId: 1, points: 30, rebounds: 10, assists: 5 }),
      line({ gameId: 3, playerId: 1, points: 30, rebounds: 10, assists: 5 }),
      line({ gameId: 2, playerId: 2, points: 10 }),
      line({ gameId: 3, playerId: 2, points: 10 }),
    ];
    // Player 1 only appears in 1 of the last 3 (game 3) — wait, games 1 and 3.
    // Last 3 are games 1,2,3 so player 1 has 2 appearances. Player 2 has 2.
    const hot = computeHotPlayer(games, lines)!;
    expect(hot.playerId).toBe(1);
    expect(hot.gamesPlayed).toBeGreaterThanOrEqual(HOT_PLAYER_MIN_APPEARANCES);
    expect(hot.windowGames).toBe(HOT_PLAYER_WINDOW);
  });

  it("excludes practice and unpublished games from the window", () => {
    const games = [
      game({ id: 1, tipoffAt: "2026-09-01T00:00:00Z" }),
      game({ id: 2, tipoffAt: "2026-09-08T00:00:00Z", isPractice: true }),
      game({ id: 3, tipoffAt: "2026-09-15T00:00:00Z", isPublished: false }),
      game({ id: 4, tipoffAt: "2026-09-22T00:00:00Z" }),
      game({ id: 5, tipoffAt: "2026-09-29T00:00:00Z" }),
    ];
    const lines = [
      line({ gameId: 1, playerId: 1, points: 5 }),
      line({ gameId: 2, playerId: 1, points: 40 }),
      line({ gameId: 3, playerId: 1, points: 40 }),
      line({ gameId: 4, playerId: 1, points: 12, rebounds: 4, assists: 2 }),
      line({ gameId: 5, playerId: 1, points: 14, rebounds: 5, assists: 3 }),
      line({ gameId: 4, playerId: 2, points: 8 }),
      line({ gameId: 5, playerId: 2, points: 6 }),
    ];
    // Counted window: games 1,4,5. Player 1 appears in all three.
    const hot = computeHotPlayer(games, lines)!;
    expect(hot.playerId).toBe(1);
    expect(hot.windowGames).toBe(3);
    expect(hot.gamesPlayed).toBe(3);
    // Practice/unpublished inflated lines must not dominate averages.
    expect(hot.avgPoints).toBeCloseTo((5 + 12 + 14) / 3);
  });

  it("ranks by avg PIR, then latest PIR, then avg points, then playerId", () => {
    const { games } = season(3);
    // Both avg PIR = 15. Player A latest PIR higher.
    const linesA = [
      line({ gameId: 1, playerId: 1, points: 10, rebounds: 5 }), // PIR 15
      line({ gameId: 2, playerId: 1, points: 10, rebounds: 5 }), // PIR 15
      line({ gameId: 3, playerId: 1, points: 12, rebounds: 5 }), // PIR 17 latest
      line({ gameId: 1, playerId: 2, points: 10, rebounds: 5 }),
      line({ gameId: 2, playerId: 2, points: 12, rebounds: 5 }), // PIR 17
      line({ gameId: 3, playerId: 2, points: 8, rebounds: 5 }), // PIR 13 latest
    ];
    expect(computeHotPlayer(games, linesA)!.playerId).toBe(1);

    // Same avg PIR and latest PIR — higher avg points wins.
    const linesB = [
      line({ gameId: 1, playerId: 1, points: 10, rebounds: 5 }),
      line({ gameId: 2, playerId: 1, points: 10, rebounds: 5 }),
      line({ gameId: 3, playerId: 1, points: 10, rebounds: 5 }),
      line({ gameId: 1, playerId: 2, points: 8, rebounds: 7 }),
      line({ gameId: 2, playerId: 2, points: 8, rebounds: 7 }),
      line({ gameId: 3, playerId: 2, points: 8, rebounds: 7 }),
    ];
    expect(computeHotPlayer(games, linesB)!.playerId).toBe(1);

    // Full tie on averages — lower playerId wins.
    const linesC = [
      line({ gameId: 1, playerId: 3, points: 10 }),
      line({ gameId: 2, playerId: 3, points: 10 }),
      line({ gameId: 3, playerId: 3, points: 10 }),
      line({ gameId: 1, playerId: 5, points: 10 }),
      line({ gameId: 2, playerId: 5, points: 10 }),
      line({ gameId: 3, playerId: 5, points: 10 }),
    ];
    expect(computeHotPlayer(games, linesC)!.playerId).toBe(3);
  });

  it("treats null optional stats as zero in PIR", () => {
    const { games } = season(2);
    const lines = [
      line({ gameId: 1, playerId: 1, points: 10, steals: null, blocks: null, turnovers: null }),
      line({ gameId: 2, playerId: 1, points: 10 }),
    ];
    const hot = computeHotPlayer(games, lines)!;
    expect(hot.avgPir).toBe(10);
  });

  it("skips players with only one appearance in the window", () => {
    const { games } = season(3);
    const lines = [
      line({ gameId: 3, playerId: 1, points: 50, rebounds: 20, assists: 10 }),
      line({ gameId: 1, playerId: 2, points: 8 }),
      line({ gameId: 2, playerId: 2, points: 8 }),
      line({ gameId: 3, playerId: 2, points: 8 }),
    ];
    expect(computeHotPlayer(games, lines)!.playerId).toBe(2);
  });
});

describe("buildPlayerTrend", () => {
  it("returns chronological appearances capped at TREND_WINDOW with rolling averages", () => {
    const { games } = season(12);
    const lines = games.map((g, i) => line({ gameId: g.id, playerId: 1, points: i + 1, rebounds: 2, assists: 1 }));
    const trend = buildPlayerTrend(1, games, lines);
    expect(trend).toHaveLength(TREND_WINDOW);
    expect(trend[0]!.gameId).toBe(3); // appearances 3..12
    expect(trend[0]!.points).toBe(3);
    expect(trend[0]!.rollingPoints).toBe(3);
    expect(trend[1]!.rollingPoints).toBe((3 + 4) / 2);
    expect(trend[2]!.rollingPoints).toBe((3 + 4 + 5) / 3);
    expect(trend[3]!.rollingPoints).toBe((4 + 5 + 6) / 3);
    expect(trend.at(-1)!.opponent).toBe("יריבה 12");
    expect(metricValue(trend[0]!, "points")).toBe(3);
    expect(rollingMetricValue(trend[2]!, "points")).toBe((3 + 4 + 5) / 3);
  });

  it("ignores games the player missed and non-counted games", () => {
    const games = [
      game({ id: 1, tipoffAt: "2026-09-01T00:00:00Z" }),
      game({ id: 2, tipoffAt: "2026-09-08T00:00:00Z", isPractice: true }),
      game({ id: 3, tipoffAt: "2026-09-15T00:00:00Z" }),
    ];
    const lines = [
      line({ gameId: 1, playerId: 1, points: 5 }),
      line({ gameId: 2, playerId: 1, points: 99 }),
      line({ gameId: 3, playerId: 2, points: 10 }),
    ];
    const trend = buildPlayerTrend(1, games, lines);
    expect(trend).toHaveLength(1);
    expect(trend[0]!.points).toBe(5);
  });
});

describe("buildTeamTrend", () => {
  it("uses official scores for the latest counted games", () => {
    const games = [
      game({ id: 1, tipoffAt: "2026-09-01T00:00:00Z", teamScore: 70, opponentScore: 80 }),
      game({ id: 2, tipoffAt: "2026-09-08T00:00:00Z", isPractice: true, teamScore: 100, opponentScore: 50 }),
      game({ id: 3, tipoffAt: "2026-09-15T00:00:00Z", teamScore: 90, opponentScore: 85 }),
      game({ id: 4, tipoffAt: "2026-09-22T00:00:00Z", teamScore: 88, opponentScore: 70 }),
    ];
    const trend = buildTeamTrend(games);
    expect(trend.map((p) => p.gameId)).toEqual([1, 3, 4]);
    expect(trend[0]!.rollingTeamScore).toBe(70);
    expect(trend[1]!.rollingTeamScore).toBe((70 + 90) / 2);
    expect(trend[2]!.rollingTeamScore).toBe((70 + 90 + 88) / 3);
    expect(trend[2]!.rollingOpponentScore).toBe((80 + 85 + 70) / 3);
  });
});
