/**
 * Run IBBA schedule sync locally (same logic as edge function). Requires:
 * SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL, optional PUSH_DISPATCH_SECRET for pushes.
 */
import { createClient } from "@supabase/supabase-js";
import { fetchTeamEvents } from "../supabase/functions/_shared/ibba-api";
import {
  OUR_TEAM_ID,
  applyChanges,
  diffEvent,
  matchEvents,
  pushBodyForChanges,
  snapshotFromEvent,
  type LocalGame,
} from "../supabase/functions/_shared/ibba-diff";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(url, key);
const pushSecret = process.env.PUSH_DISPATCH_SECRET;
const site = (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "").replace(/\/$/, "");

async function postSite(path: string, body: Record<string, unknown>) {
  if (!site || !pushSecret) return;
  await fetch(`${site}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-push-secret": pushSecret },
    body: JSON.stringify(body),
  }).catch(() => null);
}

const changesLog: unknown[] = [];
let error: string | null = null;

try {
  const events = await fetchTeamEvents();
  const { data: gameRows, error: gErr } = await db
    .from("games")
    .select(
      "id, opponent, tipoff_at, location, home_away, status, team_score, opponent_score, ibba_event_id, ibba_snapshot",
    )
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
      if (pub?.is_published && diffs.length) {
        await postSite("/api/push/dispatch", {
          topic: "games",
          title: "עדכון לוח משחקים",
          body: pushBodyForChanges(game.opponent, diffs),
          url: `/games/${game.id}`,
          tag: `game-change-${game.id}`,
        });
      }
      changesLog.push({ gameId: game.id, changes: diffs });
    } else {
      await db.from("games").update(patch).eq("id", game.id);
    }
  }
  await postSite("/api/revalidate", { paths: ["/", "/games", "/scouting"] });
} catch (e) {
  error = e instanceof Error ? e.message : String(e);
}

await db.from("ibba_sync_runs").insert({ mode: "schedule", changes: changesLog, error });
console.log(error ? { ok: false, error } : { ok: true, changes: changesLog.length, sample: changesLog.slice(0, 3) });
process.exit(error ? 1 : 0);
