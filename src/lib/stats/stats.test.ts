import { describe, expect, it } from "vitest";
import type { Game, StatLine } from "@/types/domain";
import { aggregateLines, countedLines, safeDivide, seasonHighs, teamGameTotals, teamSeasonAverages } from "./aggregate";
import { currentStreak, gameResult, lastGame, nextGame, record } from "./games";
import { computeLeaders, minGamesForLeaders } from "./leaders";

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

describe("safeDivide", () => {
  it("returns null on zero denominators", () => {
    expect(safeDivide(5, 0)).toBeNull();
    expect(safeDivide(6, 3)).toBe(2);
  });
});

describe("aggregateLines", () => {
  it("counts a zero-stat row as a game played", () => {
    const agg = aggregateLines(1, [line({ points: 10 }), line({ gameId: 2 })]);
    expect(agg.gp).toBe(2);
    expect(agg.ppg).toBe(5);
  });

  it("averages optional stats only over games where they were recorded", () => {
    const agg = aggregateLines(1, [line({ steals: 4 }), line({ gameId: 2, steals: null }), line({ gameId: 3, steals: 2 })]);
    expect(agg.gp).toBe(3);
    expect(agg.steals.games).toBe(2);
    expect(agg.steals.perGame).toBe(3);
  });

  it("returns null percentages when no attempts were recorded", () => {
    const agg = aggregateLines(1, [line({ points: 12 })]);
    expect(agg.fg.pct).toBeNull();
    expect(agg.three.pct).toBeNull();
    expect(agg.ft.pct).toBeNull();
  });

  it("returns null percentage for zero attempts and computes made/attempted otherwise", () => {
    expect(aggregateLines(1, [line({ ftMade: 0, ftAttempted: 0 })]).ft.pct).toBeNull();
    const agg = aggregateLines(1, [line({ fgMade: 4, fgAttempted: 10 }), line({ gameId: 2, fgMade: 6, fgAttempted: 10 })]);
    expect(agg.fg.pct).toBe(0.5);
  });

  it("has null averages for players without games", () => {
    expect(aggregateLines(1, []).ppg).toBeNull();
  });
});

describe("countedLines", () => {
  it("excludes rows from non-final or unpublished games", () => {
    const games = [game({ id: 1 }), game({ id: 2, status: "scheduled" }), game({ id: 3, isPublished: false })];
    const lines = [line({ gameId: 1 }), line({ gameId: 2 }), line({ gameId: 3 })];
    expect(countedLines(lines, games).map((l) => l.gameId)).toEqual([1]);
  });
});

describe("team totals", () => {
  it("sums player rows and keeps unrecorded optional stats null", () => {
    const totals = teamGameTotals([line({ points: 10, rebounds: 3 }), line({ playerId: 2, points: 5, rebounds: 2 })]);
    expect(totals.points).toBe(15);
    expect(totals.rebounds).toBe(5);
    expect(totals.steals).toBeNull();
  });

  it("uses official scores for team PPG", () => {
    const avg = teamSeasonAverages([game({ id: 1, teamScore: 80, opponentScore: 70 }), game({ id: 2, teamScore: 60, opponentScore: 66 })], []);
    expect(avg.gp).toBe(2);
    expect(avg.ppg).toBe(70);
    expect(avg.oppPpg).toBe(68);
  });
});

describe("games", () => {
  const games = [
    game({ id: 1, tipoffAt: "2026-09-01T00:00:00Z", teamScore: 70, opponentScore: 80 }),
    game({ id: 2, tipoffAt: "2026-09-08T00:00:00Z" }),
    game({ id: 3, tipoffAt: "2026-09-15T00:00:00Z" }),
    game({ id: 4, tipoffAt: "2026-09-29T00:00:00Z", status: "scheduled", teamScore: null, opponentScore: null }),
    game({ id: 5, tipoffAt: "2026-09-22T00:00:00Z", status: "scheduled", teamScore: null, opponentScore: null }),
  ];

  it("derives results", () => {
    expect(gameResult(games[0]!)).toBe("loss");
    expect(gameResult(games[1]!)).toBe("win");
    expect(gameResult(games[3]!)).toBeNull();
  });

  it("computes record and streak", () => {
    expect(record(games)).toEqual({ wins: 2, losses: 1 });
    expect(currentStreak(games)).toEqual({ type: "win", count: 2 });
    expect(currentStreak([])).toBeNull();
  });

  it("excludes practice games from the season record and streak", () => {
    const withPractice = [
      game({ id: 1, tipoffAt: "2026-09-01T00:00:00Z", teamScore: 70, opponentScore: 80 }),
      game({ id: 2, tipoffAt: "2026-09-08T00:00:00Z", isPractice: true }),
      game({ id: 3, tipoffAt: "2026-09-15T00:00:00Z" }),
    ];
    expect(record(withPractice)).toEqual({ wins: 1, losses: 1 });
    expect(currentStreak(withPractice)).toEqual({ type: "win", count: 1 });
  });

  it("finds last and next games", () => {
    expect(lastGame(games)?.id).toBe(3);
    expect(nextGame(games)?.id).toBe(5);
  });
});

describe("leaders", () => {
  it("requires half of completed games", () => {
    expect(minGamesForLeaders(6)).toBe(3);
    expect(minGamesForLeaders(5)).toBe(3);
    expect(minGamesForLeaders(0)).toBe(1);
  });

  it("ranks qualified players and drops empty categories", () => {
    const a = aggregateLines(1, [line({ points: 20 }), line({ gameId: 2, points: 10 })]);
    const b = aggregateLines(2, [line({ playerId: 2, points: 40 })]);
    const c = aggregateLines(3, [line({ playerId: 3, points: 12 }), line({ playerId: 3, gameId: 2, points: 12 })]);
    const boards = computeLeaders([a, b, c], 4);
    const points = boards.find((x) => x.category === "points")!;
    expect(points.entries.map((e) => e.playerId)).toEqual([1, 3]);
    expect(boards.find((x) => x.category === "steals")).toBeUndefined();
  });
});

describe("seasonHighs", () => {
  it("returns the best single game per stat", () => {
    const highs = seasonHighs([line({ points: 10, rebounds: 9 }), line({ gameId: 2, points: 22, rebounds: 4 })]);
    expect(highs.find((h) => h.key === "points")).toEqual({ key: "points", value: 22, gameId: 2 });
    expect(highs.find((h) => h.key === "steals")).toBeUndefined();
  });
});
