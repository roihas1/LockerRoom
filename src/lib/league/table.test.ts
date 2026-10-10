import { describe, expect, it } from "vitest";
import { decodeEntities, parseLeagueTable, standingsAroundUs, type StandingRow } from "./table";

const row = (name: string, extra: Record<string, unknown> = {}) => ({
  name,
  pos: 0,
  gp: 0,
  w: 0,
  l: 0,
  bf: 0,
  ba: 0,
  bd: 0,
  pts: 0,
  pf: "0.0",
  pa: "0",
  ...extra,
});

describe("decodeEntities", () => {
  it("decodes named and numeric entities", () => {
    expect(decodeEntities("מכבי פ&quot;ת סירקין")).toBe('מכבי פ"ת סירקין');
    expect(decodeEntities("רגילה &#8211; 2026")).toBe("רגילה – 2026");
  });
});

describe("parseLeagueTable", () => {
  it("skips the header row, uses totals, flags our team, and sorts by position", () => {
    const table = parseLeagueTable(
      {
        title: { rendered: "ליגה &#8211; 2026" },
        link: "https://ibasketball.co.il/table/1/",
        data: {
          "0": { name: "קבוצה", pos: "מיקום" },
          "10": row("ב", { pos: 2, gp: 2, w: 1, l: 1, bf: 140, ba: 150, bd: -10, pts: 3, pf: "70.0" }),
          "20": row("א", { pos: 1, gp: 2, w: 2, l: 0, bf: 160, ba: 120, bd: 40, pts: 4 }),
        },
      },
      10,
    );
    expect(table.title).toBe("ליגה – 2026");
    expect(table.rows.map((r) => r.teamId)).toEqual([20, 10]);
    expect(table.rows[1]).toMatchObject({ isUs: true, pf: 140, pa: 150, diff: -10 });
    expect(table.rows[0]?.isUs).toBe(false);
  });

  it("orders unplayed tables by name when every position is 0", () => {
    const table = parseLeagueTable({ data: { "1": row("ג"), "2": row("א"), "3": row("ב") } }, 0);
    expect(table.rows.map((r) => r.name)).toEqual(["א", "ב", "ג"]);
  });
});

describe("standingsAroundUs", () => {
  const table = (n: number, us: number): StandingRow[] =>
    Array.from({ length: n }, (_, i) => ({ teamId: i, name: `${i}`, pos: i + 1, gp: 1, w: 0, l: 0, pf: 0, pa: 0, diff: 0, pts: 0, isUs: i === us }));
  const ids = (n: number, us: number) => standingsAroundUs(table(n, us))?.rows.map((r) => r.teamId);

  it("shows one team above and one below", () => {
    expect(ids(11, 5)).toEqual([4, 5, 6]);
  });

  it("takes both neighbors from below when first and from above when last", () => {
    expect(ids(11, 0)).toEqual([0, 1, 2]);
    expect(ids(11, 10)).toEqual([8, 9, 10]);
  });

  it("returns null when our team is missing", () => {
    expect(standingsAroundUs(table(5, -1))).toBeNull();
  });
});
