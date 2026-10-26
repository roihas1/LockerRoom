import { describe, expect, it } from "vitest";
import type { Game } from "@/types/domain";
import { homeMode } from "./mode";

function game(id: number, tipoffAt: string, status: Game["status"], score: [number, number] | null = null): Game {
  return {
    id,
    seasonId: 1,
    roundNumber: id,
    opponent: "יריבה",
    tipoffAt,
    location: null,
    homeAway: "home",
    status,
    teamScore: score?.[0] ?? null,
    opponentScore: score?.[1] ?? null,
    recap: null,
    playerOfGameId: null,
    potgNote: null,
    playOfGameMediaId: null,
    isPublished: true,
  isPractice: false,
  isCup: false,
  };
}

const now = Date.parse("2026-10-10T09:00:00Z"); // 12:00 in Israel

describe("homeMode", () => {
  it("is game day when a game is live", () => {
    expect(homeMode([game(1, "2026-10-09T18:00:00Z", "live")], now)).toBe("gameDay");
  });

  it("is game day when the next game tips off later today in Israel", () => {
    expect(homeMode([game(1, "2026-10-10T18:30:00Z", "scheduled")], now)).toBe("gameDay");
  });

  it("uses the Israel calendar day, not UTC", () => {
    // 23:30 UTC on the 10th is already the 11th in Israel.
    expect(homeMode([game(1, "2026-10-10T21:30:00Z", "scheduled")], now)).toBe("default");
  });

  it("is post game within 48 hours of the last final game", () => {
    const games = [game(1, "2026-10-08T18:00:00Z", "final", [70, 60]), game(2, "2026-10-20T18:00:00Z", "scheduled")];
    expect(homeMode(games, now)).toBe("postGame");
  });

  it("falls back to default after the post game window", () => {
    const games = [game(1, "2026-10-05T18:00:00Z", "final", [70, 60]), game(2, "2026-10-20T18:00:00Z", "scheduled")];
    expect(homeMode(games, now)).toBe("default");
  });

  it("prefers game day over post game", () => {
    const games = [game(1, "2026-10-09T18:00:00Z", "final", [70, 60]), game(2, "2026-10-10T17:00:00Z", "scheduled")];
    expect(homeMode(games, now)).toBe("gameDay");
  });
});
