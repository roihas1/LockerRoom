import { describe, expect, it } from "vitest";
import type { StatLine } from "@/types/domain";
import { generateRoasts, MAX_ROASTS_PER_GAME, MAX_ROASTS_PER_PLAYER, roastPostBody } from "./roasts";

function line(playerId: number, overrides: Partial<StatLine> = {}): StatLine {
  return {
    gameId: 1,
    playerId,
    points: 8,
    rebounds: 3,
    assists: 2,
    steals: 1,
    blocks: 0,
    turnovers: 1,
    fouls: 2,
    fgMade: 3,
    fgAttempted: 6,
    threeMade: 1,
    threeAttempted: 2,
    ftMade: 1,
    ftAttempted: 2,
    ...overrides,
  };
}

const players = new Map([
  [1, { name: "דני", nickname: "הטיל" }],
  [2, { name: "יוסי", nickname: null }],
  [3, { name: "משה", nickname: null }],
]);
const even = { teamScore: 60, opponentScore: 50 };

describe("generateRoasts", () => {
  it("returns nothing for a normal game", () => {
    expect(generateRoasts([line(1), line(2)], players, even)).toEqual([]);
  });

  it("roasts a zero for many shooting night using the nickname", () => {
    const roasts = generateRoasts([line(1, { fgMade: 0, fgAttempted: 9, points: 0 })], players, even);
    expect(roasts[0]!.playerId).toBe(1);
    expect(roasts[0]!.text).toContain("הטיל");
    expect(roasts[0]!.text).toContain("9");
  });

  it("caps roasts per player and per game", () => {
    const disaster = { fgMade: 0, fgAttempted: 10, threeMade: 0, threeAttempted: 6, turnovers: 6, fouls: 5, ftMade: 0, ftAttempted: 6 };
    const roasts = generateRoasts([line(1, disaster), line(2, disaster), line(3, disaster)], players, { teamScore: 40, opponentScore: 70 });
    expect(roasts).toHaveLength(MAX_ROASTS_PER_GAME);
    expect(roasts[0]!.playerId).toBeNull();
    for (const id of [1, 2, 3]) {
      expect(roasts.filter((r) => r.playerId === id).length).toBeLessThanOrEqual(MAX_ROASTS_PER_PLAYER);
    }
  });

  it("is deterministic regardless of input order", () => {
    const lines = [line(1, { turnovers: 5 }), line(2, { fouls: 5 }), line(3, { fgMade: 0, fgAttempted: 7 })];
    const a = generateRoasts(lines, players, even);
    const b = generateRoasts([...lines].reverse(), players, even);
    expect(a).toEqual(b);
  });

  it("calls out close wins without roasting quiet lines", () => {
    const quiet = line(2, {
      points: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      fgAttempted: 0,
      fgMade: 0,
      ftAttempted: 0,
      ftMade: 0,
      threeAttempted: 0,
      threeMade: 0,
    });
    const roasts = generateRoasts([quiet], players, { teamScore: 51, opponentScore: 50 });
    expect(roasts.map((r) => r.playerId)).toEqual([null]);
  });

  it("roasts close losses and airballs", () => {
    const airball = line(1, { threeMade: 0, threeAttempted: 5, fgMade: 2, fgAttempted: 4, points: 4 });
    const roasts = generateRoasts([airball], players, { teamScore: 50, opponentScore: 52 });
    expect(roasts[0]!.playerId).toBeNull();
    expect(roasts.some((r) => r.playerId === 1 && r.text.includes("0 מתוך 5"))).toBe(true);
  });
});

describe("roastPostBody", () => {
  it("is empty without roasts", () => {
    expect(roastPostBody([], "מכבי")).toBe("");
  });

  it("lists each roast on its own line", () => {
    const body = roastPostBody([{ playerId: 1, text: "א", severity: 1 }, { playerId: 2, text: "ב", severity: 1 }], "מכבי");
    expect(body).toContain("מכבי");
    expect(body.split("\n").filter((l) => l.startsWith("🔥"))).toHaveLength(2);
  });
});
