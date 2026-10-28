import { afterEach, describe, expect, it, vi } from "vitest";
import { applyEventDiff } from "./apply-events";
import type { SnapshotDiff } from "./diff";

type Ev = { id: number; game_id: number; player_id: number | null; kind: string; value: number };
type Filter = (r: Record<string, unknown>) => boolean;

/** Minimal game_events stand-in that records every query so batching can be asserted. */
function fakeClient(initial: Ev[], opts: { failOn?: "select" | "delete" | "insert" } = {}) {
  let events = initial.map((e) => ({ ...e }));
  let nextId = 1000;
  const queries: string[] = [];

  class Query {
    private op: "select" | "delete" | "insert" = "select";
    private filters: Filter[] = [];
    private rows: Omit<Ev, "id">[] = [];
    select() {
      this.op = "select";
      return this;
    }
    delete() {
      this.op = "delete";
      return this;
    }
    insert(rows: Omit<Ev, "id">[]) {
      this.op = "insert";
      this.rows = rows;
      return this;
    }
    eq(col: string, val: unknown) {
      this.filters.push((r) => r[col] === val);
      return this;
    }
    in(col: string, vals: unknown[]) {
      this.filters.push((r) => vals.includes(r[col]));
      return this;
    }
    order() {
      return this;
    }
    limit() {
      return this;
    }
    then<T>(resolve: (v: { data: unknown; error: { message: string } | null }) => T) {
      return Promise.resolve(this.run()).then(resolve);
    }
    private run() {
      queries.push(this.op);
      if (opts.failOn === this.op) return { data: null, error: { message: `${this.op} failed` } };
      const match = () => events.filter((e) => this.filters.every((f) => f(e as unknown as Record<string, unknown>)));
      if (this.op === "select") return { data: match().sort((a, b) => b.id - a.id), error: null };
      if (this.op === "delete") {
        const gone = new Set(match());
        events = events.filter((e) => !gone.has(e));
        return { data: null, error: null };
      }
      for (const row of this.rows) events.push({ id: nextId++, ...row });
      return { data: null, error: null };
    }
  }

  return {
    client: { from: () => new Query() } as unknown as Parameters<typeof applyEventDiff>[0],
    queries,
    events: () => events,
  };
}

const ev = (id: number, playerId: number | null, kind: string, value: number): Ev => ({ id, game_id: 1, player_id: playerId, kind, value });
const diff = (over: Partial<SnapshotDiff>): SnapshotDiff => ({ inserts: [], removals: [], clearedPlayerIds: [], ...over });

afterEach(() => vi.restoreAllMocks());

describe("applyEventDiff", () => {
  it("writes any number of new events with a single insert", async () => {
    const f = fakeClient([]);

    const ok = await applyEventDiff(
      f.client,
      1,
      diff({
        inserts: [
          { playerId: 1, kind: "points", value: 2 },
          { playerId: 1, kind: "rebound", value: 1 },
          { playerId: null, kind: "opponent_points", value: 3 },
        ],
      }),
    );

    expect(ok).toBe(true);
    expect(f.queries).toEqual(["insert"]);
    expect(f.events()).toHaveLength(3);
  });

  it("takes back several stats with one load and one delete, not one lookup per stat", async () => {
    const f = fakeClient([ev(1, 1, "points", 2), ev(2, 1, "points", 2), ev(3, 1, "rebound", 1), ev(4, 1, "steal", 1), ev(5, null, "opponent_points", 2)]);

    const ok = await applyEventDiff(
      f.client,
      1,
      diff({
        removals: [
          { playerId: 1, kind: "points", amount: 2 },
          { playerId: 1, kind: "rebound", amount: 1 },
          { playerId: null, kind: "opponent_points", amount: 2 },
        ],
      }),
    );

    expect(ok).toBe(true);
    expect(f.queries).toEqual(["select", "delete"]);
    expect(f.events().map((e) => e.id).sort()).toEqual([1, 4]);
  });

  it("takes back the newest events first", async () => {
    const f = fakeClient([ev(1, 1, "points", 2), ev(2, 1, "points", 3), ev(3, 1, "points", 2)]);

    await applyEventDiff(f.client, 1, diff({ removals: [{ playerId: 1, kind: "points", amount: 5 }] }));

    expect(f.events().map((e) => e.id)).toEqual([1]);
  });

  it("re-inserts the leftover when an undo only takes part of a bigger event", async () => {
    const f = fakeClient([ev(1, 1, "points", 3)]);

    await applyEventDiff(f.client, 1, diff({ removals: [{ playerId: 1, kind: "points", amount: 1 }] }));

    expect(f.queries).toEqual(["select", "delete", "insert"]);
    expect(f.events().map((e) => ({ kind: e.kind, value: e.value, player: e.player_id }))).toEqual([{ kind: "points", value: 2, player: 1 }]);
  });

  it("never takes another player's events or the opponent's", async () => {
    const f = fakeClient([ev(1, 1, "points", 2), ev(2, 2, "points", 2), ev(3, null, "opponent_points", 2)]);

    await applyEventDiff(f.client, 1, diff({ removals: [{ playerId: 2, kind: "points", amount: 2 }] }));

    expect(f.events().map((e) => e.id).sort()).toEqual([1, 3]);
  });

  it("clears every event of a player taken off the sheet", async () => {
    const f = fakeClient([ev(1, 1, "points", 2), ev(2, 1, "steal", 1), ev(3, 2, "points", 2)]);

    await applyEventDiff(f.client, 1, diff({ clearedPlayerIds: [1] }));

    expect(f.queries).toEqual(["delete"]);
    expect(f.events().map((e) => e.id)).toEqual([3]);
  });

  it("does nothing, and queries nothing, for an empty diff", async () => {
    const f = fakeClient([ev(1, 1, "points", 2)]);

    expect(await applyEventDiff(f.client, 1, diff({}))).toBe(true);
    expect(f.queries).toEqual([]);
  });

  it("reports failure and logs it with the game id instead of failing silently", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const f = fakeClient([], { failOn: "insert" });

    const ok = await applyEventDiff(f.client, 7, diff({ inserts: [{ playerId: 1, kind: "points", value: 2 }] }));

    expect(ok).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("game 7"), "insert failed");
  });

  it("reports a failed delete too (it used to be ignored)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const f = fakeClient([ev(1, 1, "points", 2)], { failOn: "delete" });

    const ok = await applyEventDiff(f.client, 1, diff({ clearedPlayerIds: [1] }));

    expect(ok).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
  });

  it("never throws into the live save", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const exploding = { from: () => { throw new Error("boom"); } } as unknown as Parameters<typeof applyEventDiff>[0];

    await expect(applyEventDiff(exploding, 1, diff({ inserts: [{ playerId: 1, kind: "points", value: 2 }] }))).resolves.toBe(false);
  });
});
