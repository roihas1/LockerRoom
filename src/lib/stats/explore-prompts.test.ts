import { describe, expect, it } from "vitest";
import {
  milestoneBallCount,
  milestoneBallLeaders,
  milestoneTracksForAggregate,
  nearestMilestoneProgress,
  topPirNights,
} from "./explore-prompts";
import type { PlayerAggregate } from "./aggregate";
import type { Game, StatLine } from "@/types/domain";

function line(partial: Partial<StatLine> & Pick<StatLine, "gameId" | "playerId">): StatLine {
  return {
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
    ...partial,
  };
}

function agg(partial: Partial<PlayerAggregate> & Pick<PlayerAggregate, "playerId">): PlayerAggregate {
  return {
    gp: 1,
    points: 0,
    rebounds: 0,
    assists: 0,
    pir: 0,
    ppg: null,
    rpg: null,
    apg: null,
    pirPerGame: null,
    steals: { sum: 0, games: 0, perGame: null },
    blocks: { sum: 0, games: 0, perGame: null },
    turnovers: { sum: 0, games: 0, perGame: null },
    fouls: { sum: 0, games: 0, perGame: null },
    fg: { made: 0, attempted: 0, games: 0, pct: null },
    three: { made: 0, attempted: 0, games: 0, pct: null },
    ft: { made: 0, attempted: 0, games: 0, pct: null },
    ...partial,
  };
}

describe("topPirNights", () => {
  it("ranks individual lines by PIR", () => {
    const games = [
      { id: 1, opponent: "A", tipoffAt: "2026-01-01T18:00:00Z" },
      { id: 2, opponent: "B", tipoffAt: "2026-01-08T18:00:00Z" },
    ] as Game[];
    const lines = [
      line({ gameId: 1, playerId: 10, points: 20, rebounds: 5, assists: 2 }),
      line({ gameId: 2, playerId: 11, points: 8, rebounds: 12, assists: 6 }),
    ];
    const nights = topPirNights(games, lines, 2);
    expect(nights[0]?.playerId).toBe(10);
    expect(nights[0]?.opponent).toBe("A");
    expect(nights).toHaveLength(2);
  });
});

describe("nearestMilestoneProgress", () => {
  it("surfaces one closest chase per player", () => {
    const items = nearestMilestoneProgress(
      [agg({ playerId: 1, points: 95 }), agg({ playerId: 2, points: 40 }), agg({ playerId: 3, points: 0 })],
      5,
    );
    expect(items[0]).toMatchObject({ playerId: 1, stat: "points", current: 95, next: 100 });
    expect(items.filter((i) => i.playerId === 1)).toHaveLength(1);
    expect(items.some((i) => i.playerId === 3)).toBe(false);
  });
});

describe("milestone balls", () => {
  it("counts earned thresholds as balls", () => {
    const a = agg({ playerId: 1, points: 120, rebounds: 55, assists: 10 });
    // pts 25/50/75/100, reb 15/30/45, ast 5/10 → 9 balls
    expect(milestoneBallCount(a)).toBe(9);
    const points = milestoneTracksForAggregate(a).find((t) => t.stat === "points")!;
    expect(points.earned).toEqual([25, 50, 75, 100]);
    expect(points.next).toBe(125);
  });

  it("ranks all players by ball count and pads missing roster ids", () => {
    const leaders = milestoneBallLeaders(
      [agg({ playerId: 1, points: 120 }), agg({ playerId: 2, points: 55 }), agg({ playerId: 3, points: 10 })],
      { ensurePlayerIds: [1, 2, 3, 4, 5] },
    );
    expect(leaders.map((l) => l.playerId)).toEqual([1, 2, 3, 4, 5]);
    expect(leaders[0]?.balls).toBe(4);
    expect(leaders[3]).toMatchObject({ playerId: 4, balls: 0, next: null });
    expect(leaders[4]).toMatchObject({ playerId: 5, balls: 0, next: null });
  });
});
