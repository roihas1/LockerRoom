import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  IBBA,
  fetchLeagueEvents,
  fetchLeagueTeamNames,
  fetchTeamEvents,
  fetchTeamLists,
  parseListPlayers,
  setIbbaFetchContext,
} from "../_shared/ibba-api.ts";
import {
  OUR_TEAM_ID,
  applyChanges,
  diffEvent,
  matchEvents,
  pushBodyForChanges,
  snapshotFromEvent,
  type LocalGame,
} from "../_shared/ibba-diff.ts";

type Mode = "schedule" | "scouting";
type Db = ReturnType<typeof createClient>;

let pushSecretCache: string | null | undefined;
async function resolvePushSecret(db: Db): Promise<string | null> {
  if (pushSecretCache !== undefined) return pushSecretCache;
  const env = Deno.env.get("PUSH_DISPATCH_SECRET");
  if (env) {
    pushSecretCache = env;
    return env;
  }
  const { data } = await db.rpc("internal_push_dispatch_secret");
  pushSecretCache = typeof data === "string" ? data : null;
  return pushSecretCache;
}

let siteUrlCache: string | undefined;
async function resolveSiteUrl(db: Db): Promise<string> {
  if (siteUrlCache !== undefined) return siteUrlCache;
  const env = (Deno.env.get("SITE_URL") ?? Deno.env.get("NEXT_PUBLIC_SITE_URL") ?? "").replace(/\/$/, "");
  if (env) {
    siteUrlCache = env;
    return env;
  }
  const { data } = await db.rpc("internal_site_url");
  siteUrlCache = typeof data === "string" ? data.replace(/\/$/, "") : "";
  return siteUrlCache;
}

async function authorized(req: Request, db: Db): Promise<boolean> {
  const given = req.headers.get("x-push-secret");
  if (!given) return false;
  const expected = await resolvePushSecret(db);
  return Boolean(expected && expected === given);
}

async function postSite(db: Db, path: string, body: Record<string, unknown>) {
  const base = await resolveSiteUrl(db);
  const secret = await resolvePushSecret(db);
  if (!base || !secret) return;
  await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-push-secret": secret },
    body: JSON.stringify(body),
  }).catch(() => null);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, serviceKey);

  if (!(await authorized(req, db))) return Response.json({ ok: false }, { status: 401 });

  let mode: Mode = "schedule";
  try {
    const body = await req.json();
    if (body?.mode === "scouting") mode = "scouting";
  } catch {
    /* default schedule */
  }

  const changesLog: unknown[] = [];
  let error: string | null = null;

  setIbbaFetchContext(await resolveSiteUrl(db), await resolvePushSecret(db));

  try {
    if (mode === "schedule") {
      const events = await fetchTeamEvents();
      const { data: gameRows, error: gErr } = await db
        .from("games")
        .select("id, opponent, tipoff_at, location, home_away, status, team_score, opponent_score, ibba_event_id, ibba_snapshot")
        .order("tipoff_at");
      if (gErr) throw gErr;

      const games: LocalGame[] = (gameRows ?? []).map((g) => ({
        id: g.id,
        opponent: g.opponent,
        tipoffAt: g.tipoff_at,
        location: g.location,
        homeAway: g.home_away,
        status: g.status,
        teamScore: g.team_score,
        opponentScore: g.opponent_score,
        ibbaEventId: g.ibba_event_id,
        ibbaSnapshot: g.ibba_snapshot as LocalGame["ibbaSnapshot"],
      }));

      const matched = matchEvents(games, events, OUR_TEAM_ID);
      const now = new Date().toISOString();

      for (const game of games) {
        let event = matched.get(game.id);
        if (!event && game.ibbaEventId) event = events.find((e) => e.id === game.ibbaEventId);
        if (!event) continue;

        if (!game.ibbaEventId) {
          const snap = snapshotFromEvent(event, OUR_TEAM_ID);
          const patch: Record<string, unknown> = {
            ibba_event_id: event.id,
            ibba_snapshot: snap,
            ibba_checked_at: now,
          };
          if (game.opponent !== snap.opponentName) patch.opponent = snap.opponentName;
          await db.from("games").update(patch).eq("id", game.id);
          changesLog.push({ gameId: game.id, baseline: true, opponentFix: game.opponent !== snap.opponentName });
          continue;
        }

        const linked = events.find((e) => e.id === game.ibbaEventId) ?? event;
        const diffs = diffEvent(game.ibbaSnapshot, linked, OUR_TEAM_ID);
        const snap = snapshotFromEvent(linked, OUR_TEAM_ID);
        const patch: Record<string, unknown> = {
          ibba_snapshot: snap,
          ibba_checked_at: now,
          ibba_event_id: linked.id,
        };

        if (diffs.length) {
          const applied = applyChanges(game, diffs, linked, OUR_TEAM_ID);
          if (applied.tipoffAt) patch.tipoff_at = applied.tipoffAt;
          if (applied.location) patch.location = applied.location;
          if (applied.homeAway) patch.home_away = applied.homeAway;
          if (applied.opponent) patch.opponent = applied.opponent;
          if (applied.teamScore != null && applied.opponentScore != null) {
            patch.team_score = applied.teamScore;
            patch.opponent_score = applied.opponentScore;
            patch.status = "final";
          }

          await db.from("games").update(patch).eq("id", game.id);

          const { data: pub } = await db.from("games").select("is_published").eq("id", game.id).single();
          if (pub?.is_published) {
            await postSite(db, "/api/push/dispatch", {
              topic: "games",
              title: "עדכון לוח משחקים",
              body: pushBodyForChanges(game.opponent, diffs),
              url: `/games/${game.id}`,
              tag: `game-change-${game.id}`,
            });
          }

          if (applied.status === "final" && applied.fillScoreOnly) {
            await db
              .from("games")
              .update({ final_push_sent_at: now })
              .eq("id", game.id)
              .eq("status", "final")
              .is("final_push_sent_at", null);
            const { data: fin } = await db
              .from("games")
              .select("team_score, opponent_score, opponent, is_published")
              .eq("id", game.id)
              .single();
            if (fin?.is_published && fin.team_score != null) {
              const won = fin.team_score > fin.opponent_score!;
              await postSite(db, "/api/push/dispatch", {
                topic: "games",
                title: won ? "ניצחון!" : "המשחק הסתיים",
                body: `${fin.team_score}:${fin.opponent_score} מול ${fin.opponent}`,
                url: `/games/${game.id}`,
                tag: `final-${game.id}`,
              });
            }
          }

          changesLog.push({ gameId: game.id, changes: diffs });
        } else {
          await db.from("games").update(patch).eq("id", game.id);
        }
      }

      await postSite(db, "/api/revalidate", { paths: ["/", "/games", "/scouting"] });
    } else {
      const teamNames = await fetchLeagueTeamNames();
      for (const [id, name] of Object.entries(teamNames)) {
        await db.from("ibba_teams").upsert({ id: Number(id), name, updated_at: new Date().toISOString() });
      }

      const leagueEvents = await fetchLeagueEvents();
      for (const e of leagueEvents) {
        const [homeId, awayId] = e.teams;
        const played = e.homePoints > 0 || e.awayPoints > 0 || e.status === "publish";
        await db.from("ibba_league_games").upsert({
          event_id: e.id,
          played_at: e.date,
          home_team_id: homeId,
          away_team_id: awayId,
          home_points: e.homePoints,
          away_points: e.awayPoints,
          played,
          updated_at: new Date().toISOString(),
        });
      }

      for (const [tid, tname] of Object.entries(teamNames)) {
        if (Number(tid) === OUR_TEAM_ID) continue;
        const lists = await fetchTeamLists(Number(tid)).catch(() => []);
        const current = lists.find((l) => l.seasons?.includes(IBBA.seasonId));
        if (!current) continue;
        const players = parseListPlayers(current, Number(tid));
        for (const p of players) {
          await db.from("ibba_players").upsert({ ...p, updated_at: new Date().toISOString() });
        }
        if (!players.length) {
          changesLog.push({ teamId: tid, note: "empty list", name: tname });
        }
      }

      await postSite(db, "/api/revalidate", { paths: ["/scouting"] });
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  await db.from("ibba_sync_runs").insert({
    mode,
    changes: changesLog,
    error,
  });

  if (error) return Response.json({ ok: false, error }, { status: 500 });
  return Response.json({ ok: true, mode, changes: changesLog.length });
});
