import { describe, expect, it } from "vitest";
import { anyInLiveWindow, isInLiveWindow } from "./live-window";

const now = Date.parse("2026-10-28T20:00:00Z");
const hours = (h: number) => new Date(now + h * 3_600_000).toISOString();

describe("isInLiveWindow", () => {
  it("is always true for a live game, whatever the tipoff", () => {
    expect(isInLiveWindow({ status: "live", tipoffAt: hours(-48) }, now)).toBe(true);
  });

  it("is false for final games", () => {
    expect(isInLiveWindow({ status: "final", tipoffAt: hours(-1) }, now)).toBe(false);
  });

  it("covers an unfinished game around tipoff, before and after", () => {
    expect(isInLiveWindow({ status: "scheduled", tipoffAt: hours(3) }, now)).toBe(true);
    expect(isInLiveWindow({ status: "scheduled", tipoffAt: hours(-3) }, now)).toBe(true);
  });

  it("ignores games days away", () => {
    expect(isInLiveWindow({ status: "scheduled", tipoffAt: hours(72) }, now)).toBe(false);
    expect(isInLiveWindow({ status: "scheduled", tipoffAt: hours(-72) }, now)).toBe(false);
  });
});

describe("anyInLiveWindow", () => {
  it("is true when any game is in window", () => {
    expect(
      anyInLiveWindow(
        [
          { status: "final", tipoffAt: hours(-200) },
          { status: "live", tipoffAt: hours(-1) },
        ],
        now,
      ),
    ).toBe(true);
  });

  it("is false for an empty or quiet season", () => {
    expect(anyInLiveWindow([], now)).toBe(false);
    expect(anyInLiveWindow([{ status: "scheduled", tipoffAt: hours(100) }], now)).toBe(false);
  });
});
