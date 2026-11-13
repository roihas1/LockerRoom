import { describe, expect, it } from "vitest";
import { clichePickWeight, isAttributedCliche, isClicheWeightBucket, pickWeightedCliche } from "./cliches";

describe("pickWeightedCliche", () => {
  it("returns null for an empty list", () => {
    expect(pickWeightedCliche([])).toBeNull();
  });

  it("returns the only item", () => {
    const only = { id: 1, weight: 50, verified: false, saidBy: "כל מאמן" };
    expect(pickWeightedCliche([only])).toBe(only);
  });

  it("prefers attributed quotes over generic ones", () => {
    const generic = { id: 1, weight: 100, verified: false, saidBy: "כל מאמן בישראל" };
    const named = { id: 2, weight: 70, verified: true, saidBy: "שלמה שרף" };
    // Mid ticket in the named band after boost (named effective 420, generic 100).
    expect(pickWeightedCliche([generic, named], () => 0.5)).toBe(named);
  });
});

describe("isAttributedCliche", () => {
  it("treats verified and named speakers as attributed", () => {
    expect(isAttributedCliche({ verified: true, saidBy: "כל מאמן" })).toBe(true);
    expect(isAttributedCliche({ verified: false, saidBy: "פיני גרשון" })).toBe(true);
    expect(isAttributedCliche({ verified: false, saidBy: "כל פרשן" })).toBe(false);
    expect(isAttributedCliche({ verified: false, saidBy: "קלישאת מאמנים" })).toBe(false);
  });
});

describe("clichePickWeight", () => {
  it("boosts verified more than generic", () => {
    expect(clichePickWeight({ weight: 100, verified: true, saidBy: "עודד קטש" })).toBeGreaterThan(
      clichePickWeight({ weight: 100, verified: false, saidBy: "כל מאמן" }),
    );
  });
});

describe("isClicheWeightBucket", () => {
  it("accepts the three buckets", () => {
    expect(isClicheWeightBucket(60)).toBe(true);
    expect(isClicheWeightBucket(80)).toBe(true);
    expect(isClicheWeightBucket(100)).toBe(true);
    expect(isClicheWeightBucket(70)).toBe(false);
  });
});
