import { describe, expect, it } from "vitest";
import {
  birthdayPushCopy,
  filterBirthdayCandidates,
  isBirthdayOn,
  jerusalemDateKey,
  pickVariantIndex,
} from "./birthdays";

describe("isBirthdayOn", () => {
  it("matches month and day", () => {
    expect(isBirthdayOn("1996-10-18", "2026-10-18")).toBe(true);
    expect(isBirthdayOn("1996-10-18", "2026-10-19")).toBe(false);
  });

  it("moves Feb 29 to March 1 on non-leap years", () => {
    expect(isBirthdayOn("2000-02-29", "2026-03-01")).toBe(true);
    expect(isBirthdayOn("2000-02-29", "2026-02-28")).toBe(false);
    expect(isBirthdayOn("2000-02-29", "2024-02-29")).toBe(true);
  });
});

describe("filterBirthdayCandidates", () => {
  const players = [
    { playerId: 1, name: "דני לוי", nickname: "המנוע", birthDate: "1996-10-18" },
    { playerId: 2, name: "רועי כהן", nickname: null, birthDate: "1996-07-13" },
  ];

  it("keeps only today and skips already-sent", () => {
    const today = "2026-10-18";
    expect(filterBirthdayCandidates(players, today, new Map([[1, null], [2, null]])).map((p) => p.playerId)).toEqual([1]);
    expect(filterBirthdayCandidates(players, today, new Map([[1, today], [2, null]]))).toEqual([]);
  });
});

describe("birthdayPushCopy", () => {
  it("is deterministic and includes the display name", () => {
    const player = { playerId: 5, name: "רועי הס", nickname: null, birthDate: "1996-07-13" };
    const a = birthdayPushCopy(player, "2026-07-13");
    const b = birthdayPushCopy(player, "2026-07-13");
    expect(a).toEqual(b);
    expect(a.title).toContain("רועי");
    expect(a.url).toBe("/players/5");
    expect(a.tag).toBe("birthday-5-2026");
  });

  it("prefers nickname in the copy", () => {
    const copy = birthdayPushCopy(
      { playerId: 1, name: "דניאל לוי", nickname: "המנוע", birthDate: "1996-01-01" },
      "2026-01-01",
    );
    expect(copy.title.includes("המנוע") || copy.body.includes("המנוע")).toBe(true);
  });

  it("uses Yuval the manager override", () => {
    const copy = birthdayPushCopy(
      { playerId: 2, name: "יובל אוחיון", nickname: null, birthDate: "1996-11-14" },
      "2026-11-14",
    );
    expect(copy.title).toBe("מזל טוב לאוחיון 🎂");
    expect(copy.body).toContain("המנג׳ר חוגג 30");
    expect(copy.body).toContain("אוהבים ❤️");
  });
});

describe("pickVariantIndex / jerusalemDateKey", () => {
  it("is stable", () => {
    expect(pickVariantIndex("x", 4)).toBe(pickVariantIndex("x", 4));
  });

  it("returns YYYY-MM-DD", () => {
    expect(jerusalemDateKey(new Date("2026-10-18T08:00:00.000Z"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
