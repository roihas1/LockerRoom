import { describe, expect, it } from "vitest";
import { formatTime, fromIsraelInputs, toIsraelInputs } from "./dates";

describe("Israel timezone conversion", () => {
  it("handles summer time (UTC+3)", () => {
    const iso = fromIsraelInputs("2026-09-03", "20:30");
    expect(iso).toBe("2026-09-03T17:30:00.000Z");
    expect(toIsraelInputs(iso)).toEqual({ date: "2026-09-03", time: "20:30" });
  });

  it("handles winter time (UTC+2)", () => {
    const iso = fromIsraelInputs("2027-01-14", "20:30");
    expect(iso).toBe("2027-01-14T18:30:00.000Z");
    expect(formatTime(iso)).toBe("20:30");
  });

  it("round-trips across midnight", () => {
    const iso = fromIsraelInputs("2026-12-01", "00:15");
    expect(toIsraelInputs(iso)).toEqual({ date: "2026-12-01", time: "00:15" });
  });

  it("rejects invalid input", () => {
    expect(() => fromIsraelInputs("bad", "20:00")).toThrow();
  });
});
