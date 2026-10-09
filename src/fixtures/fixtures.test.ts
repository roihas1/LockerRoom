import { describe, expect, it } from "vitest";
import { findForbiddenLatin } from "@/config/hebrew-allowlist";
import { fixtureExercises, fixtureGameMedia, fixtureGames, fixturePlayers, fixturePosts, fixtureStatLines } from ".";

describe("fixtures", () => {
  it("has at least the required demo volume", () => {
    expect(fixturePlayers.length).toBeGreaterThanOrEqual(10);
    expect(fixtureGames.filter((g) => g.status === "final").length).toBeGreaterThanOrEqual(6);
    expect(fixtureExercises.length).toBeGreaterThanOrEqual(10);
    expect(fixturePosts.length).toBeGreaterThanOrEqual(5);
  });

  it("player points add up to the official team score", () => {
    for (const g of fixtureGames.filter((x) => x.status === "final")) {
      const sum = fixtureStatLines.filter((l) => l.gameId === g.id).reduce((s, l) => s + l.points, 0);
      expect(sum).toBe(g.teamScore);
      expect(g.teamScore).not.toBe(g.opponentScore);
    }
  });

  it("shooting splits are internally consistent", () => {
    for (const l of fixtureStatLines) {
      if (l.fgMade === null) continue;
      expect(l.fgMade).toBeLessThanOrEqual(l.fgAttempted!);
      expect(l.threeMade!).toBeLessThanOrEqual(l.threeAttempted!);
      expect(l.threeMade!).toBeLessThanOrEqual(l.fgMade);
      expect(l.ftMade!).toBeLessThanOrEqual(l.ftAttempted!);
      expect(l.points).toBe(2 * (l.fgMade - l.threeMade!) + 3 * l.threeMade! + l.ftMade!);
    }
  });

  it("uses unique media ids and storage keys", () => {
    const media = [
      ...fixtureGameMedia,
      ...fixturePosts.flatMap((p) => p.media),
      ...fixturePlayers.map((p) => p.photo!),
      ...fixtureExercises.flatMap((e) => [e.video, e.thumbnail]).filter((m) => m !== null),
    ];
    expect(new Set(media.map((m) => m.id)).size).toBe(media.length);
    expect(new Set(media.map((m) => m.storageKey)).size).toBe(media.length);
  });

  it("player of the game actually played", () => {
    for (const g of fixtureGames.filter((x) => x.playerOfGameId)) {
      expect(fixtureStatLines.some((l) => l.gameId === g.id && l.playerId === g.playerOfGameId)).toBe(true);
    }
  });

  it("contains no stray English words in Hebrew copy", () => {
    const copy = [
      ...fixtureGames.flatMap((g) => [g.recap ?? "", g.potgNote ?? ""]),
      ...fixtureExercises.flatMap((e) => [e.title, e.description ?? "", ...e.instructions, ...e.coachingPoints]),
    ];
    for (const text of copy) expect(findForbiddenLatin(text)).toEqual([]);
  });
});
