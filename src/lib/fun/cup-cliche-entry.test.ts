import { describe, expect, it } from "vitest";
import type { Game } from "@/types/domain";
import { nextCupGame, showCupClicheHomeCard } from "./cup-cliche-entry";

function game(partial: Partial<Game> & Pick<Game, "id" | "tipoffAt" | "isCup">): Game {
  return {
    seasonId: 1,
    roundNumber: null,
    opponent: "יריבה",
    location: null,
    homeAway: "home",
    status: "scheduled",
    teamScore: null,
    opponentScore: null,
    recap: null,
    playerOfGameId: null,
    potgNote: null,
    playOfGameMediaId: null,
    isPublished: true,
    isPractice: false,
    excludeFromStats: false,
    ...partial,
  };
}

describe("cup cliche entry", () => {
  const now = Date.parse("2026-11-13T12:00:00+02:00");

  it("finds the next cup game", () => {
    const games = [
      game({ id: 1, tipoffAt: "2026-12-09T20:00:00+02:00", isCup: true }),
      game({ id: 2, tipoffAt: "2026-12-20T20:00:00+02:00", isCup: true }),
      game({ id: 3, tipoffAt: "2026-12-06T20:00:00+02:00", isCup: false }),
    ];
    expect(nextCupGame(games, now)?.id).toBe(1);
  });

  it("shows the home card whenever a cup game is upcoming", () => {
    const games = [game({ id: 1, tipoffAt: "2026-12-09T20:00:00+02:00", isCup: true })];
    expect(showCupClicheHomeCard(games, now)?.id).toBe(1);
  });

  it("hides the home card when there is no upcoming cup", () => {
    const games = [game({ id: 1, tipoffAt: "2026-10-01T20:00:00+02:00", isCup: true, status: "final" })];
    expect(showCupClicheHomeCard(games, now)).toBeNull();
  });
});
