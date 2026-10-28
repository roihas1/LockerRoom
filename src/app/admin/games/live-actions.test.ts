import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildLiveStatsFormData, emptyLiveLine, type LiveStatsClientState } from "@/lib/live-stats/form-data";

type Row = Record<string, unknown>;
type Filter = (r: Row) => boolean;

/** Minimal in-memory stand-in for the Supabase query builder, enough for the live-stats actions. */
const db = vi.hoisted(() => ({
  tables: {} as Record<string, Row[]>,
  /** When set, selecting any live_* column on games fails like a DB that never ran the migration. */
  missingLiveColumns: false,
  /** Runs right before a games update, to simulate a concurrent request (e.g. Finish) landing mid-save. */
  beforeGamesUpdate: null as null | (() => void),
  updates: [] as { table: string; values: Row }[],
  deletes: [] as { table: string }[],
  /** Makes the next player_game_stats upsert fail, like a dropped connection mid-start. */
  failStatsUpsert: false,
}));

vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin: vi.fn(async () => undefined) }));
vi.mock("@/lib/supabase/env", () => ({ isDemoMode: () => false }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("@/lib/cache/revalidate-public", () => ({ revalidatePublic: vi.fn() }));
vi.mock("@/lib/push/notify", () => ({ notifyGameLive: vi.fn(), notifyLiveMomentOnce: vi.fn(async () => undefined) }));
vi.mock("@/lib/live-stats/apply-events", () => ({ applyEventDiff: vi.fn(async () => undefined) }));
vi.mock("@/lib/admin/roast-post", () => ({ createRoastDraft: vi.fn(async () => undefined) }));
vi.mock("@/lib/admin/game-final", () => ({ handleGameFinalized: vi.fn(async () => undefined) }));

vi.mock("@/lib/supabase/server", () => {
  class Query {
    private filters: Filter[] = [];
    private op: "select" | "update" | "delete" | "upsert" = "select";
    private values: Row | Row[] = {};
    private columns = "";
    private returning = false;
    private ignoreDuplicates = false;
    private mode: "one" | "maybe" | null = null;

    constructor(private table: string) {}

    select(columns = "*") {
      if (this.op === "select") this.columns = columns;
      else this.returning = true;
      return this;
    }
    update(values: Row) {
      this.op = "update";
      this.values = values;
      return this;
    }
    delete() {
      this.op = "delete";
      return this;
    }
    upsert(values: Row[], options?: { ignoreDuplicates?: boolean }) {
      this.op = "upsert";
      this.values = values;
      this.ignoreDuplicates = options?.ignoreDuplicates ?? false;
      return this;
    }
    eq(col: string, val: unknown) {
      this.filters.push((r) => r[col] === val);
      return this;
    }
    in(col: string, values: unknown[]) {
      this.filters.push((r) => values.includes(r[col]));
      return this;
    }
    not(col: string, _op: string, list: string) {
      const ids = list.replace(/[()]/g, "").split(",").map(Number);
      this.filters.push((r) => !ids.includes(r[col] as number));
      return this;
    }
    maybeSingle() {
      this.mode = "maybe";
      return this;
    }
    single() {
      this.mode = "one";
      return this;
    }

    then<T>(resolve: (v: { data: unknown; error: unknown }) => T) {
      return Promise.resolve(this.run()).then(resolve);
    }

    private run(): { data: unknown; error: unknown } {
      const rows = (db.tables[this.table] ??= []);
      const match = () => rows.filter((r) => this.filters.every((f) => f(r)));

      if (this.op === "select") {
        if (this.table === "games" && db.missingLiveColumns && this.columns.includes("live_")) {
          return { data: null, error: { code: "42703", message: 'column "live_max_deficit" does not exist' } };
        }
        // Like the real client, hand back a snapshot: later writes must not change what a caller already read.
        const found = match().map((r) => ({ ...r }));
        if (this.mode === "one") {
          return found[0] ? { data: found[0], error: null } : { data: null, error: { code: "PGRST116", message: "no rows" } };
        }
        return { data: found, error: null };
      }

      if (this.op === "update") {
        if (this.table === "games") db.beforeGamesUpdate?.();
        db.updates.push({ table: this.table, values: this.values as Row });
        const found = match();
        for (const r of found) Object.assign(r, this.values);
        if (this.returning) return { data: this.mode === "maybe" ? (found[0] ?? null) : found, error: null };
        return { data: null, error: null };
      }

      if (this.op === "delete") {
        db.deletes.push({ table: this.table });
        const found = new Set(match());
        db.tables[this.table] = rows.filter((r) => !found.has(r));
        return { data: null, error: null };
      }

      if (db.failStatsUpsert && this.table === "player_game_stats") {
        return { data: null, error: { code: "08006", message: "connection lost" } };
      }
      for (const v of this.values as Row[]) {
        const existing = rows.find((r) => r.game_id === v.game_id && r.player_id === v.player_id);
        if (existing) {
          if (!this.ignoreDuplicates) Object.assign(existing, v);
        } else rows.push({ ...v });
      }
      return { data: null, error: null };
    }
  }

  return { createSessionClient: async () => ({ from: (table: string) => new Query(table) }) };
});

import { revalidatePath } from "next/cache";
import { handleGameFinalized } from "@/lib/admin/game-final";
import { applyEventDiff } from "@/lib/live-stats/apply-events";
import { notifyGameLive } from "@/lib/push/notify";
import { finishLiveGameAction, reopenLiveGameAction, saveLiveStatsSnapshot, startLiveGameAction } from "./live-actions";

const GAME_ID = 4;

function liveGame(over: Row = {}): Row {
  return {
    id: GAME_ID,
    season_id: 1,
    status: "live",
    opponent: "יריבה",
    is_published: true,
    team_score: 0,
    opponent_score: 0,
    live_max_deficit: 0,
    live_extra_push_count: 0,
    live_comeback_push_sent_at: null,
    live_lead_push_sent_at: null,
    ...over,
  };
}

function stateWith(players: Record<number, Partial<ReturnType<typeof emptyLiveLine>>>, scores: [number, number]): LiveStatsClientState {
  const lines: LiveStatsClientState["lines"] = {};
  for (const [id, over] of Object.entries(players)) lines[Number(id)] = { ...emptyLiveLine(Number(id)), ...over };
  return { playedPlayerIds: Object.keys(players).map(Number), lines, teamScore: scores[0], opponentScore: scores[1] };
}

const save = (state: LiveStatsClientState) => saveLiveStatsSnapshot(null, buildLiveStatsFormData(GAME_ID, state));
const game = () => db.tables.games![0]!;
const statRows = () => db.tables.player_game_stats!;

beforeEach(() => {
  vi.clearAllMocks();
  db.tables = { games: [liveGame()], player_game_stats: [] };
  db.failStatsUpsert = false;
  db.missingLiveColumns = false;
  db.beforeGamesUpdate = null;
  db.updates = [];
  db.deletes = [];
});

describe("saveLiveStatsSnapshot", () => {
  it("saves player stats and both scores for a live game", async () => {
    const result = await save(stateWith({ 7: { points: 10, rebounds: 3 }, 8: { points: 2, assists: 4 } }, [12, 49]));

    expect(result.ok).toBe(true);
    expect(statRows()).toHaveLength(2);
    expect(statRows().find((r) => r.player_id === 7)).toMatchObject({ points: 10, rebounds: 3 });
    expect(game()).toMatchObject({ team_score: 12, opponent_score: 49, status: "live" });
  });

  it("keeps saving across many events (each event is a full snapshot)", async () => {
    let points = 0;
    for (let i = 0; i < 12; i++) {
      points += 2;
      const result = await save(stateWith({ 7: { points } }, [points, i * 3]));
      expect(result.ok).toBe(true);
    }
    expect(statRows()).toHaveLength(1);
    expect(statRows()[0]).toMatchObject({ points: 24 });
    expect(game()).toMatchObject({ team_score: 24, opponent_score: 33 });
  });

  it("refuses to write to a finished game and never reverts it to live", async () => {
    db.tables.games = [liveGame({ status: "final", team_score: 55, opponent_score: 49 })];

    const result = await save(stateWith({ 7: { points: 99 } }, [99, 0]));

    expect(result).toMatchObject({ ok: false, code: "not_live" });
    expect(game()).toMatchObject({ status: "final", team_score: 55, opponent_score: 49 });
    expect(statRows()).toHaveLength(0);
  });

  it("does not revive a game that is finished by a concurrent request mid-save", async () => {
    db.beforeGamesUpdate = () => {
      game().status = "final";
    };

    const result = await save(stateWith({ 7: { points: 2 } }, [2, 0]));

    expect(result).toMatchObject({ ok: false, code: "not_live" });
    expect(game().status).toBe("final");
    expect(game().team_score).toBe(0);
  });

  it("never wipes the box score when the roster payload is empty", async () => {
    await save(stateWith({ 7: { points: 10 }, 8: { points: 4 } }, [14, 10]));
    expect(statRows()).toHaveLength(2);

    const result = await save({ playedPlayerIds: [], lines: {}, teamScore: 14, opponentScore: 10 });

    expect(result.ok).toBe(true);
    expect(statRows()).toHaveLength(2);
  });

  it("removes only the players dropped from the roster", async () => {
    await save(stateWith({ 7: { points: 10 }, 8: { points: 4 } }, [14, 10]));

    await save(stateWith({ 7: { points: 10 } }, [10, 10]));

    expect(statRows().map((r) => r.player_id)).toEqual([7]);
  });

  it("still saves stats and scores when the live_* push columns are missing", async () => {
    db.missingLiveColumns = true;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await save(stateWith({ 7: { points: 6 } }, [6, 8]));

    expect(result.ok).toBe(true);
    expect(game()).toMatchObject({ team_score: 6, opponent_score: 8 });
    expect(statRows()[0]).toMatchObject({ points: 6 });
    expect(db.updates.every((u) => !("live_max_deficit" in u.values))).toBe(true);
    errorSpy.mockRestore();
  });

  it("does not rewrite the game row when only player stats changed", async () => {
    // A consistent live game: the 2-point deficit it has already seen is recorded.
    db.tables.games = [liveGame({ team_score: 10, opponent_score: 12, live_max_deficit: 2 })];

    const result = await save(stateWith({ 7: { points: 10, rebounds: 4 } }, [10, 12]));

    expect(result.ok).toBe(true);
    expect(statRows()[0]).toMatchObject({ points: 10, rebounds: 4 });
    expect(db.updates.filter((u) => u.table === "games")).toHaveLength(0);
  });

  it("writes only the score that moved", async () => {
    db.tables.games = [liveGame({ team_score: 10, opponent_score: 12 })];

    await save(stateWith({ 7: { points: 12 } }, [12, 12]));

    const gameWrites = db.updates.filter((u) => u.table === "games");
    expect(gameWrites).toHaveLength(1);
    expect(gameWrites[0]!.values).toMatchObject({ team_score: 12 });
    expect(gameWrites[0]!.values).not.toHaveProperty("opponent_score");
    expect(game()).toMatchObject({ team_score: 12, opponent_score: 12 });
  });

  it("still saves a score that goes back down (undo)", async () => {
    db.tables.games = [liveGame({ team_score: 12, opponent_score: 12 })];

    await save(stateWith({ 7: { points: 10 } }, [10, 12]));

    expect(game()).toMatchObject({ team_score: 10, opponent_score: 12 });
  });

  it("still writes events for every save, even when the game row is untouched", async () => {
    db.tables.games = [liveGame({ team_score: 10, opponent_score: 12 })];

    await save(stateWith({ 7: { points: 10 } }, [10, 12]));

    expect(applyEventDiff).toHaveBeenCalledTimes(1);
  });

  it("only revalidates public pages while autosaving, never the admin pages", async () => {
    await save(stateWith({ 7: { points: 2 } }, [2, 0]));

    const paths = vi.mocked(revalidatePath).mock.calls.map(([p]) => p);
    expect(paths).toContain(`/games/${GAME_ID}`);
    expect(paths).toContain("/games");
    expect(paths).toContain("/");
    expect(paths.some((p) => p.startsWith("/admin"))).toBe(false);
  });

  it("rejects invalid payloads without touching the database", async () => {
    const fd = buildLiveStatsFormData(GAME_ID, stateWith({ 7: { points: 2 } }, [2, 0]));
    fd.set("points_7", "-5");

    const result = await saveLiveStatsSnapshot(null, fd);

    expect(result).toMatchObject({ ok: false, code: "validation" });
    expect(statRows()).toHaveLength(0);
  });
});

describe("startLiveGameAction", () => {
  it("goes live at 0:0 with zeroed rows for the chosen players", async () => {
    db.tables.games = [liveGame({ status: "scheduled", team_score: null, opponent_score: null })];

    const result = await startLiveGameAction(GAME_ID, [7, 8, 8]);

    expect(result.ok).toBe(true);
    expect(game()).toMatchObject({ status: "live", team_score: 0, opponent_score: 0 });
    expect(statRows().map((r) => r.player_id).sort()).toEqual([7, 8]);
  });

  it("keeps an existing score instead of resetting it", async () => {
    db.tables.games = [liveGame({ status: "scheduled", team_score: 10, opponent_score: 12 })];

    await startLiveGameAction(GAME_ID, [7]);

    expect(game()).toMatchObject({ status: "live", team_score: 10, opponent_score: 12 });
  });

  it("requires at least one player", async () => {
    db.tables.games = [liveGame({ status: "scheduled" })];

    expect(await startLiveGameAction(GAME_ID, [])).toMatchObject({ ok: false, code: "validation" });
    expect(game().status).toBe("scheduled");
  });

  it("refuses a stale Start on a game that is already live and leaves its box score alone", async () => {
    db.tables.games = [liveGame({ status: "live", team_score: 20, opponent_score: 15 })];
    db.tables.player_game_stats = [
      { game_id: GAME_ID, player_id: 7, points: 12, rebounds: 3, assists: 1, turnovers: 0, steals: 0, blocks: 0 },
    ];

    const result = await startLiveGameAction(GAME_ID, [7, 8]);

    expect(result).toMatchObject({ ok: false, code: "not_startable" });
    expect(statRows()).toHaveLength(1);
    expect(statRows()[0]).toMatchObject({ player_id: 7, points: 12, rebounds: 3, assists: 1 });
    expect(game()).toMatchObject({ status: "live", team_score: 20, opponent_score: 15 });
    expect(notifyGameLive).not.toHaveBeenCalled();
  });

  it("refuses to bring a final game back to life", async () => {
    db.tables.games = [liveGame({ status: "final", team_score: 55, opponent_score: 49 })];
    db.tables.player_game_stats = [
      { game_id: GAME_ID, player_id: 7, points: 55, rebounds: 0, assists: 0, turnovers: 0, steals: 0, blocks: 0 },
    ];

    const result = await startLiveGameAction(GAME_ID, [7]);

    expect(result).toMatchObject({ ok: false, code: "not_startable" });
    expect(game()).toMatchObject({ status: "final", team_score: 55, opponent_score: 49 });
    expect(statRows()[0]).toMatchObject({ points: 55 });
  });

  it("keeps stats that already exist for a player when starting, and only adds the missing ones", async () => {
    db.tables.games = [liveGame({ status: "scheduled", team_score: null, opponent_score: null })];
    db.tables.player_game_stats = [
      { game_id: GAME_ID, player_id: 7, points: 5, rebounds: 2, assists: 0, turnovers: 0, steals: 0, blocks: 0 },
    ];

    const result = await startLiveGameAction(GAME_ID, [7, 8]);

    expect(result.ok).toBe(true);
    expect(statRows().find((r) => r.player_id === 7)).toMatchObject({ points: 5, rebounds: 2 });
    expect(statRows().find((r) => r.player_id === 8)).toMatchObject({ points: 0, rebounds: 0 });
  });

  it("lets only one of two simultaneous Starts through", async () => {
    db.tables.games = [liveGame({ status: "scheduled", team_score: null, opponent_score: null })];

    const [a, b] = await Promise.all([startLiveGameAction(GAME_ID, [7]), startLiveGameAction(GAME_ID, [7])]);

    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
    expect(game().status).toBe("live");
    expect(notifyGameLive).toHaveBeenCalledTimes(1);
  });

  it("announces the game once, after it is really live", async () => {
    db.tables.games = [liveGame({ status: "scheduled", team_score: null, opponent_score: null })];

    await startLiveGameAction(GAME_ID, [7]);

    expect(notifyGameLive).toHaveBeenCalledTimes(1);
    expect(notifyGameLive).toHaveBeenCalledWith({ id: GAME_ID, opponent: "יריבה", is_published: true });
  });

  it("puts the game back as it was when the roster rows cannot be written", async () => {
    db.tables.games = [liveGame({ status: "scheduled", team_score: null, opponent_score: null })];
    db.failStatsUpsert = true;

    const result = await startLiveGameAction(GAME_ID, [7]);

    expect(result.ok).toBe(false);
    expect(game()).toMatchObject({ status: "scheduled", team_score: null, opponent_score: null });
    expect(notifyGameLive).not.toHaveBeenCalled();
  });

  it("can still start a postponed game", async () => {
    db.tables.games = [liveGame({ status: "postponed", team_score: null, opponent_score: null })];

    const result = await startLiveGameAction(GAME_ID, [7]);

    expect(result.ok).toBe(true);
    expect(game().status).toBe("live");
  });
});

describe("finishLiveGameAction", () => {
  it("finalizes a live game with a decisive score", async () => {
    db.tables.games = [liveGame({ team_score: 55, opponent_score: 49 })];

    const result = await finishLiveGameAction(GAME_ID);

    expect(result.ok).toBe(true);
    expect(game().status).toBe("final");
  });

  it("refuses a tie and leaves the game live", async () => {
    db.tables.games = [liveGame({ team_score: 50, opponent_score: 50 })];

    expect(await finishLiveGameAction(GAME_ID)).toMatchObject({ ok: false, code: "validation" });
    expect(game().status).toBe("live");
  });

  it("refuses a missing score", async () => {
    db.tables.games = [liveGame({ team_score: 50, opponent_score: null })];

    expect(await finishLiveGameAction(GAME_ID)).toMatchObject({ ok: false, code: "validation" });
    expect(game().status).toBe("live");
  });

  it("refuses a game that is not live", async () => {
    db.tables.games = [liveGame({ status: "scheduled", team_score: 55, opponent_score: 49 })];

    expect(await finishLiveGameAction(GAME_ID)).toMatchObject({ ok: false, code: "validation" });
    expect(game().status).toBe("scheduled");
  });

  it("a late autosave after finish cannot bring the game back to live", async () => {
    db.tables.games = [liveGame({ team_score: 55, opponent_score: 49 })];
    await finishLiveGameAction(GAME_ID);

    const late = await save(stateWith({ 7: { points: 55 } }, [55, 49]));

    expect(late).toMatchObject({ ok: false, code: "not_live" });
    expect(game()).toMatchObject({ status: "final", team_score: 55, opponent_score: 49 });
  });

  it("runs the finalize side effects exactly once when the game is finished twice at once", async () => {
    db.tables.games = [liveGame({ team_score: 55, opponent_score: 49 })];

    const [a, b] = await Promise.all([finishLiveGameAction(GAME_ID), finishLiveGameAction(GAME_ID)]);

    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
    expect(handleGameFinalized).toHaveBeenCalledTimes(1);
    expect(game().status).toBe("final");
  });

  it("does not finalize when the game stops being live between the check and the write", async () => {
    db.tables.games = [liveGame({ team_score: 55, opponent_score: 49 })];
    db.beforeGamesUpdate = () => {
      game().status = "postponed";
    };

    const result = await finishLiveGameAction(GAME_ID);

    expect(result).toMatchObject({ ok: false, code: "validation" });
    expect(game().status).toBe("postponed");
    expect(handleGameFinalized).not.toHaveBeenCalled();
  });

  it("still refreshes the admin pages once the game is finished", async () => {
    db.tables.games = [liveGame({ team_score: 55, opponent_score: 49 })];

    await finishLiveGameAction(GAME_ID);

    const paths = vi.mocked(revalidatePath).mock.calls.map(([p]) => p);
    expect(paths).toContain(`/admin/games/${GAME_ID}`);
    expect(paths).toContain("/admin/games");
  });
});

describe("reopenLiveGameAction", () => {
  it("brings a finished game back to live with its score and stats intact", async () => {
    db.tables.games = [liveGame({ status: "final", team_score: 55, opponent_score: 49 })];
    db.tables.player_game_stats = [
      { game_id: GAME_ID, player_id: 7, points: 55, rebounds: 0, assists: 0, turnovers: 0, steals: 0, blocks: 0 },
    ];

    const result = await reopenLiveGameAction(GAME_ID);

    expect(result.ok).toBe(true);
    expect(game()).toMatchObject({ status: "live", team_score: 55, opponent_score: 49 });
    expect(statRows()[0]).toMatchObject({ points: 55 });
    expect(notifyGameLive).not.toHaveBeenCalled();
  });

  it("lets scoring continue and finish again after a reopen", async () => {
    db.tables.games = [liveGame({ status: "final", team_score: 50, opponent_score: 49 })];

    await reopenLiveGameAction(GAME_ID);
    const saved = await save(stateWith({ 7: { points: 52 } }, [52, 49]));
    const finished = await finishLiveGameAction(GAME_ID);

    expect(saved.ok).toBe(true);
    expect(finished.ok).toBe(true);
    expect(game()).toMatchObject({ status: "final", team_score: 52, opponent_score: 49 });
  });

  it("refuses a game that is not finished", async () => {
    db.tables.games = [liveGame({ status: "live" })];
    expect(await reopenLiveGameAction(GAME_ID)).toMatchObject({ ok: false, code: "validation" });

    db.tables.games = [liveGame({ status: "scheduled" })];
    expect(await reopenLiveGameAction(GAME_ID)).toMatchObject({ ok: false, code: "validation" });
    expect(game().status).toBe("scheduled");
  });

  it("rejects a missing game id", async () => {
    expect(await reopenLiveGameAction(0)).toMatchObject({ ok: false, code: "not_found" });
  });
});
