import { describe, expect, it } from "vitest";
import type { StatLine } from "@/types/domain";
import {
  formatRoastLine,
  generateRoasts,
  isRoastPost,
  MAX_ROASTS_PER_GAME,
  MAX_ROASTS_PER_PLAYER,
  parseRoastBody,
  pickVariantIndex,
  roastPostBody,
} from "./roasts";

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

describe("pickVariantIndex", () => {
  it("is stable for the same seed", () => {
    expect(pickVariantIndex("abc", 3)).toBe(pickVariantIndex("abc", 3));
  });
});

describe("generateRoasts", () => {
  it("returns nothing for a normal game", () => {
    expect(generateRoasts([line(1), line(2)], players, even)).toEqual([]);
  });

  it("roasts a zero for many shooting night using the nickname", () => {
    const roasts = generateRoasts([line(1, { fgMade: 0, fgAttempted: 9, points: 0 })], players, even);
    expect(roasts[0]!.playerId).toBe(1);
    expect(roasts[0]!.text).toContain("הטיל");
    expect(roasts[0]!.text).toContain("9");
    expect(roasts[0]!.tone).toBe("roast");
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
    expect(roasts.some((r) => r.playerId === 1 && /0 מתוך 5/.test(r.text))).toBe(true);
  });

  it("roasts ghost nights and boards without assists", () => {
    const ghost = line(1, { points: 0, rebounds: 1, assists: 0, fgMade: 0, fgAttempted: 4 });
    const boards = line(2, { points: 6, rebounds: 10, assists: 0, fgMade: 3, fgAttempted: 8 });
    const roasts = generateRoasts([ghost, boards], players, even);
    expect(roasts.some((r) => r.playerId === 1)).toBe(true);
    expect(roasts.some((r) => r.playerId === 2 && r.text.includes("10"))).toBe(true);
  });

  it("adds a praise line on wins when there is room", () => {
    const star = line(1, {
      points: 28,
      rebounds: 10,
      assists: 7,
      steals: 2,
      blocks: 1,
      turnovers: 1,
      fgMade: 10,
      fgAttempted: 16,
    });
    const roasts = generateRoasts([star], players, { teamScore: 90, opponentScore: 70 });
    expect(roasts.some((r) => r.tone === "praise" && r.playerId === 1)).toBe(true);
  });
});

describe("roast body encode/decode", () => {
  it("is empty without roasts", () => {
    expect(roastPostBody([], "מכבי")).toBe("");
  });

  it("round-trips structured lines with player ids and tones", () => {
    const roasts = [
      { playerId: null, text: "צוות", tone: "roast" as const, severity: 1 },
      { playerId: 1, text: "שחקן", tone: "roast" as const, severity: 1 },
      { playerId: 2, text: "כל הכבוד", tone: "praise" as const, severity: 1 },
    ];
    const body = roastPostBody(roasts, "מכבי");
    expect(body).toContain("מכבי");
    const parsed = parseRoastBody(body);
    expect(parsed.structured).toBe(true);
    expect(parsed.intro).toContain("מכבי");
    expect(parsed.lines).toEqual([
      { playerId: null, tone: "roast", text: "צוות" },
      { playerId: 1, tone: "roast", text: "שחקן" },
      { playerId: 2, tone: "praise", text: "כל הכבוד" },
    ]);
  });

  it("parses legacy fire lines without player ids", () => {
    const parsed = parseRoastBody("פתיח\n\n🔥 שורה ישנה");
    expect(parsed.intro).toBe("פתיח");
    expect(parsed.lines).toEqual([{ playerId: null, tone: "roast", text: "שורה ישנה" }]);
    expect(parsed.structured).toBe(false);
  });

  it("formats a single line", () => {
    expect(formatRoastLine({ playerId: 5, text: "היי", tone: "roast", severity: 1 })).toBe("🔥 @5:r:היי");
    expect(formatRoastLine({ playerId: null, text: "קבוצה", tone: "praise", severity: 1 })).toBe("🔥 @t:p:קבוצה");
  });
});

describe("isRoastPost", () => {
  it("matches funny_moment posts with the roast title", () => {
    expect(isRoastPost({ type: "funny_moment", title: "🔥 הצלייה של אחרי המשחק" })).toBe(true);
    expect(isRoastPost({ type: "funny_moment", title: "אחר" })).toBe(false);
  });
});
