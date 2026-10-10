import { describe, expect, it } from "vitest";
import { emptyReactions, funniestPostId, toReactionCounts } from "./reactions";

describe("toReactionCounts", () => {
  it("fills missing kinds and ignores unknown ones", () => {
    expect(toReactionCounts({ laugh: 3, skull: 1, nope: 9 })).toEqual({ ...emptyReactions(), laugh: 3, skull: 1 });
    expect(toReactionCounts(null)).toEqual(emptyReactions());
  });
});

describe("funniestPostId", () => {
  const now = Date.parse("2026-10-10T12:00:00Z");
  const item = (id: number, daysAgo: number, laugh: number) => ({
    id,
    publishedAt: new Date(now - daysAgo * 86_400_000).toISOString(),
    reactions: { ...emptyReactions(), laugh },
  });

  it("picks the most laughed post within the window", () => {
    expect(funniestPostId([item(1, 2, 3), item(2, 5, 7), item(3, 40, 50)], 30, now)).toBe(2);
  });

  it("returns null when nobody laughed", () => {
    expect(funniestPostId([item(1, 1, 0)], 30, now)).toBeNull();
  });
});
