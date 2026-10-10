import { describe, expect, it } from "vitest";
import { aggregateByPlayer } from "@/lib/stats/aggregate";
import type { Game, StatLine } from "@/types/domain";
import { buildWrapped } from "./wrapped";

function game(id: number, teamScore: number, opponentScore: number): Game {
  return {
    id,
    seasonId: 1,
    roundNumber: id,
    opponent: `יריבה ${id}`,
    tipoffAt: `2026-0${id}-01T18:00:00Z`,
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
  };
}

function line(playerId: number, gameId: number, points: number, rebounds = 0, assists = 0): StatLine {
  return {
    gameId,
    playerId,
    points,
    rebounds,
    assists,
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
  };
}

const games = [game(1, 60, 50), game(2, 40, 55)];
const lines = [line(1, 1, 20, 2, 1), line(1, 2, 8, 1, 0), line(2, 1, 5, 10, 1), line(2, 2, 4, 9, 1)];
const input = (playerId: number) => ({ playerId, games, lines, aggregates: [...aggregateByPlayer(lines).values()], completedGames: 2 });

describe("buildWrapped", () => {
  it("returns null for a player without games", () => {
    expect(buildWrapped(input(99))).toBeNull();
  });

  it("builds the story in order with rank, best game and record", () => {
    const slides = buildWrapped(input(1))!;
    expect(slides.map((s) => s.kind)).toEqual(["intro", "points", "bestGame", "record", "signature", "outro"]);
    expect(slides[1]).toEqual({ kind: "points", total: 28, rank: 1, teamSize: 2 });
    expect(slides[2]).toMatchObject({ kind: "bestGame", gameId: 1, points: 20 });
    expect(slides[3]).toEqual({ kind: "record", wins: 1, losses: 1 });
    expect(slides[4]).toMatchObject({ kind: "signature", stat: "points" });
  });

  it("picks the stat with the biggest team share as the signature", () => {
    const signature = buildWrapped(input(2))!.find((s) => s.kind === "signature");
    expect(signature).toMatchObject({ stat: "rebounds" });
  });
});
