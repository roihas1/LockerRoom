import { describe, expect, it } from "vitest";
import {
  detectLiveMoment,
  nextLiveMaxDeficit,
  type LiveMomentScores,
  type LiveMomentState,
} from "./live-moments";

const baseState = (over: Partial<LiveMomentState> = {}): LiveMomentState => ({
  liveMaxDeficit: 0,
  liveExtraPushCount: 0,
  comebackSent: false,
  leadSent: false,
  ...over,
});

const scores = (over: Partial<LiveMomentScores> & Pick<LiveMomentScores, "nextTeam" | "nextOpponent">): LiveMomentScores => ({
  prevTeam: null,
  prevOpponent: null,
  ...over,
});

describe("nextLiveMaxDeficit", () => {
  it("tracks the highest opponent lead across stored and snapshots", () => {
    expect(
      nextLiveMaxDeficit(5, scores({ prevTeam: 20, prevOpponent: 32, nextTeam: 40, nextOpponent: 38 })),
    ).toBe(12);
    expect(nextLiveMaxDeficit(15, scores({ prevTeam: 10, prevOpponent: 12, nextTeam: 50, nextOpponent: 40 }))).toBe(15);
  });
});

describe("detectLiveMoment", () => {
  it("fires comeback when max deficit was >=10 and we take the lead", () => {
    const result = detectLiveMoment(
      baseState({ liveMaxDeficit: 12 }),
      scores({ prevTeam: 40, prevOpponent: 42, nextTeam: 45, nextOpponent: 42 }),
    );
    expect(result.moment).toBe("comeback");
    expect(result.nextMaxDeficit).toBe(12);
  });

  it("records deficit from the previous snapshot when taking the lead in one step from -12", () => {
    const result = detectLiveMoment(
      baseState(),
      scores({ prevTeam: 30, prevOpponent: 42, nextTeam: 45, nextOpponent: 42 }),
    );
    expect(result.nextMaxDeficit).toBe(12);
    expect(result.moment).toBe("comeback");
  });

  it("does not fire comeback without a prior 10+ deficit", () => {
    const result = detectLiveMoment(
      baseState({ liveMaxDeficit: 8 }),
      scores({ prevTeam: 40, prevOpponent: 42, nextTeam: 45, nextOpponent: 42 }),
    );
    expect(result.moment).toBeNull();
  });

  it("does not fire comeback when already leading", () => {
    const result = detectLiveMoment(
      baseState({ liveMaxDeficit: 12 }),
      scores({ prevTeam: 50, prevOpponent: 40, nextTeam: 55, nextOpponent: 40 }),
    );
    expect(result.moment).toBeNull();
  });

  it("fires lead when margin first reaches +10", () => {
    const result = detectLiveMoment(
      baseState(),
      scores({ prevTeam: 48, prevOpponent: 40, nextTeam: 50, nextOpponent: 40 }),
    );
    expect(result.moment).toBe("lead");
  });

  it("does not fire lead again after it was sent", () => {
    const result = detectLiveMoment(
      baseState({ leadSent: true }),
      scores({ prevTeam: 48, prevOpponent: 40, nextTeam: 50, nextOpponent: 40 }),
    );
    expect(result.moment).toBeNull();
  });

  it("prefers comeback when both would fire on the same save", () => {
    const result = detectLiveMoment(
      baseState({ liveMaxDeficit: 12 }),
      scores({ prevTeam: 30, prevOpponent: 42, nextTeam: 55, nextOpponent: 42 }),
    );
    expect(result.moment).toBe("comeback");
  });

  it("respects the extra-push cap", () => {
    const result = detectLiveMoment(
      baseState({ liveExtraPushCount: 3, liveMaxDeficit: 12 }),
      scores({ prevTeam: 40, prevOpponent: 42, nextTeam: 45, nextOpponent: 42 }),
    );
    expect(result.moment).toBeNull();
    expect(result.nextMaxDeficit).toBe(12);
  });

  it("skips comeback when already sent", () => {
    const result = detectLiveMoment(
      baseState({ liveMaxDeficit: 12, comebackSent: true }),
      scores({ prevTeam: 40, prevOpponent: 42, nextTeam: 45, nextOpponent: 42 }),
    );
    expect(result.moment).toBeNull();
  });
});
