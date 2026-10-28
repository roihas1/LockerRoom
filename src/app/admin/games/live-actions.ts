"use server";

import { revalidatePath } from "next/cache";
import { he } from "@/config/strings";
import { handleGameFinalized } from "@/lib/admin/game-final";
import { createRoastDraft } from "@/lib/admin/roast-post";
import { requireAdmin } from "@/lib/auth/require-admin";
import { revalidatePublic } from "@/lib/cache/revalidate-public";
import { getAdminData } from "@/lib/data";
import type { GameEvent } from "@/types/domain";
import { applyEventDiff } from "@/lib/live-stats/apply-events";
import { diffSnapshots } from "@/lib/live-stats/diff";
import { nextLiveMaxDeficit } from "@/lib/push/live-moments";
import { notifyGameLive, notifyLiveMomentOnce } from "@/lib/push/notify";
import { isDemoMode } from "@/lib/supabase/env";
import { createSessionClient } from "@/lib/supabase/server";
import { actionFail, actionFromZod, actionSuccess, type ActionResult } from "@/lib/utils/action-result";
import { mapErrorToAction } from "@/lib/utils/errors";
import { parseLiveStatsPayload } from "@/lib/validation/live-stats";

async function revalidateGamePaths(gameId: number, seasonId: number) {
  revalidatePublic();
  revalidatePath("/admin/games");
  revalidatePath(`/admin/games/${gameId}`);
  revalidatePath(`/admin/games/${gameId}/live`);
  revalidatePath("/games");
  revalidatePath(`/games/${gameId}`);
  revalidatePath(`/games?season=${seasonId}`);
  revalidatePath("/");
  revalidatePath("/stats");
}

/**
 * Autosave runs on every burst of taps, so it only touches public caches. Revalidating the admin pages here
 * would re-render the live page the scorer is looking at (and send that payload back) on every save, while the
 * scoring screen deliberately ignores it. Start, finish and reopen still use the full set above.
 */
function revalidateLiveSavePaths(gameId: number, seasonId: number) {
  revalidatePublic();
  revalidatePath("/games");
  revalidatePath(`/games/${gameId}`);
  revalidatePath(`/games?season=${seasonId}`);
  revalidatePath("/");
  revalidatePath("/stats");
}

function blockLiveDemoMutation(): ActionResult | null {
  if (isDemoMode()) return actionFail(he.admin.liveStats.demoBlocked, "demo");
  return null;
}

export async function saveLiveStatsSnapshot(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const demoBlock = blockLiveDemoMutation();
  if (demoBlock) return demoBlock;

  const parsed = parseLiveStatsPayload(formData);
  if (!parsed.success) return actionFromZod(parsed.error);

  const { gameId, playedPlayerIds, lines, teamScore, opponentScore } = parsed.data;
  const supabase = await createSessionClient();
  const [{ data: game, error: loadError }, { data: liveMeta, error: liveMetaError }, { data: previousRows }] = await Promise.all([
    supabase.from("games").select("season_id, status, team_score, opponent_score, is_published").eq("id", gameId).single(),
    // Push-throttle bookkeeping is optional: if these columns are missing (schema drift) or unreadable,
    // stats and scores must still save. Moment pushes are simply skipped.
    supabase
      .from("games")
      .select("live_max_deficit, live_extra_push_count, live_comeback_push_sent_at, live_lead_push_sent_at")
      .eq("id", gameId)
      .single(),
    supabase.from("player_game_stats").select("player_id, points, rebounds, assists, turnovers, steals, blocks").eq("game_id", gameId),
  ]);
  if (loadError || !game) return mapErrorToAction(loadError ?? { message: "missing" });
  if (liveMetaError) console.error("saveLiveStatsSnapshot: live_* columns unavailable", liveMetaError.message);

  // A debounced autosave can land after "finish"; never write to (or revive) a game that is not live.
  if (game.status !== "live") return actionFail(he.admin.liveStats.saveNotLive, "not_live");

  const rows = lines.map((l) => ({
    game_id: gameId,
    player_id: l.playerId,
    points: l.points,
    rebounds: l.rebounds,
    assists: l.assists,
    turnovers: l.turnovers,
    steals: l.steals,
    blocks: l.blocks,
  }));

  if (rows.length > 0) {
    const { error: upsertError } = await supabase.from("player_game_stats").upsert(rows, { onConflict: "game_id,player_id" });
    if (upsertError) return mapErrorToAction(upsertError);
  }

  // Remove players dropped from the roster. An empty roster never means "wipe the whole box score":
  // an empty payload is almost always a transient/blank client state, so we leave existing rows alone.
  if (playedPlayerIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("player_game_stats")
      .delete()
      .eq("game_id", gameId)
      .not("player_id", "in", `(${playedPlayerIds.join(",")})`);
    if (deleteError) return mapErrorToAction(deleteError);
  }

  const scoresProvided = teamScore !== undefined && opponentScore !== undefined;
  const momentScores = scoresProvided
    ? {
        prevTeam: game.team_score,
        prevOpponent: game.opponent_score,
        nextTeam: teamScore,
        nextOpponent: opponentScore,
      }
    : null;
  const nextMaxDeficit = momentScores && liveMeta ? nextLiveMaxDeficit(liveMeta.live_max_deficit, momentScores) : null;

  const gameUpdate: {
    team_score?: number;
    opponent_score?: number;
    live_max_deficit?: number;
  } = {};
  // Only write what moved: a stats-only tap must not rewrite the game row (it would bump updated_at and
  // fire a Realtime UPDATE that makes every open fan page refetch for nothing).
  if (teamScore !== undefined && teamScore !== game.team_score) gameUpdate.team_score = teamScore;
  if (opponentScore !== undefined && opponentScore !== game.opponent_score) gameUpdate.opponent_score = opponentScore;
  if (liveMeta && nextMaxDeficit !== null && nextMaxDeficit !== liveMeta.live_max_deficit) {
    gameUpdate.live_max_deficit = nextMaxDeficit;
  }

  if (Object.keys(gameUpdate).length > 0) {
    // Conditional on status = live so a concurrent "finish" can never be reverted by a late autosave.
    const { data: updated, error: gameError } = await supabase
      .from("games")
      .update(gameUpdate)
      .eq("id", gameId)
      .eq("status", "live")
      .select("id")
      .maybeSingle();
    if (gameError) return mapErrorToAction(gameError);
    if (!updated) return actionFail(he.admin.liveStats.saveNotLive, "not_live");
  }

  if (momentScores && liveMeta) {
    await notifyLiveMomentOnce(supabase, gameId, {
      isPublished: game.is_published,
      liveMaxDeficit: liveMeta.live_max_deficit,
      liveExtraPushCount: liveMeta.live_extra_push_count,
      comebackSentAt: liveMeta.live_comeback_push_sent_at,
      leadSentAt: liveMeta.live_lead_push_sent_at,
      scores: momentScores,
    });
  }

  const previous = (previousRows ?? []).map((r) => ({
    playerId: r.player_id,
    points: r.points,
    rebounds: r.rebounds,
    assists: r.assists,
    turnovers: r.turnovers ?? 0,
    steals: r.steals ?? 0,
    blocks: r.blocks ?? 0,
  }));
  await applyEventDiff(supabase, gameId, diffSnapshots(previous, lines, game.opponent_score, opponentScore));

  revalidateLiveSavePaths(gameId, game.season_id);
  return actionSuccess(he.admin.liveStats.saved);
}

export async function startLiveGameAction(gameId: number, playerIds: number[]): Promise<ActionResult> {
  await requireAdmin();
  const demoBlock = blockLiveDemoMutation();
  if (demoBlock) return demoBlock;

  if (!gameId || !Number.isInteger(gameId)) return actionFail(he.errors.notFound, "not_found");
  const uniqueIds = [...new Set(playerIds.filter((id) => Number.isInteger(id) && id > 0))];
  if (uniqueIds.length === 0) {
    return actionFail(he.errors.validation, "validation", { playerIds: [he.validation.required] });
  }

  const supabase = await createSessionClient();
  const { data: game, error: loadError } = await supabase
    .from("games")
    .select("season_id, status, opponent, is_published, team_score, opponent_score")
    .eq("id", gameId)
    .single();
  if (loadError || !game) return mapErrorToAction(loadError ?? { message: "missing" });

  // A stale "Start" (second phone, old tab, double tap) must never touch a game that already went live or ended:
  // it would zero a running box score or bring a final game back to life.
  if (game.status === "live" || game.status === "final") return actionFail(he.admin.liveStats.startNotAllowed, "not_startable");

  const before = { status: game.status, team_score: game.team_score, opponent_score: game.opponent_score };

  // Claim the transition first, conditional on the status we just read, so two concurrent starts cannot both win.
  // A live game starts 0:0 — a real score, not a missing one — so the public boards never show a half-empty result.
  const { data: claimed, error: statusError } = await supabase
    .from("games")
    .update({ status: "live", team_score: before.team_score ?? 0, opponent_score: before.opponent_score ?? 0 })
    .eq("id", gameId)
    .eq("status", before.status)
    .select("id")
    .maybeSingle();
  if (statusError) return mapErrorToAction(statusError);
  if (!claimed) return actionFail(he.admin.liveStats.startNotAllowed, "not_startable");

  const rows = uniqueIds.map((playerId) => ({
    game_id: gameId,
    player_id: playerId,
    points: 0,
    rebounds: 0,
    assists: 0,
    turnovers: 0,
    steals: 0,
    blocks: 0,
  }));

  // Never overwrite a line that already exists: only players without a row get a fresh zeroed one.
  const { error: upsertError } = await supabase
    .from("player_game_stats")
    .upsert(rows, { onConflict: "game_id,player_id", ignoreDuplicates: true });
  if (upsertError) {
    // Do not leave a live game without its roster behind; put the game back as it was.
    await supabase.from("games").update(before).eq("id", gameId).eq("status", "live");
    return mapErrorToAction(upsertError);
  }

  notifyGameLive({ id: gameId, opponent: game.opponent, is_published: game.is_published });
  await revalidateGamePaths(gameId, game.season_id);
  return actionSuccess(he.admin.liveStats.started);
}

export async function finishLiveGameAction(gameId: number): Promise<ActionResult> {
  await requireAdmin();
  const demoBlock = blockLiveDemoMutation();
  if (demoBlock) return demoBlock;

  if (!gameId || !Number.isInteger(gameId)) return actionFail(he.errors.notFound, "not_found");

  const supabase = await createSessionClient();
  const { data: game, error: loadError } = await supabase
    .from("games")
    .select("season_id, status, team_score, opponent_score")
    .eq("id", gameId)
    .single();
  if (loadError || !game) return mapErrorToAction(loadError ?? { message: "missing" });

  if (game.status !== "live") {
    return actionFail(he.admin.liveStats.finishNotLive, "validation");
  }

  const teamScore = game.team_score;
  const opponentScore = game.opponent_score;
  if (teamScore == null || opponentScore == null) {
    return actionFail(he.admin.liveStats.finishMissingScores, "validation");
  }
  if (teamScore === opponentScore) {
    return actionFail(he.admin.liveStats.finishTied, "validation");
  }

  // Conditional on live: a double tap or a second device that already finished the game must not run the
  // finalize side effects (roast draft, milestones, push claim) a second time.
  const { data: finished, error: updateError } = await supabase
    .from("games")
    .update({ status: "final" })
    .eq("id", gameId)
    .eq("status", "live")
    .select("id")
    .maybeSingle();
  if (updateError) return mapErrorToAction(updateError);
  if (!finished) return actionFail(he.admin.liveStats.finishNotLive, "validation");

  await createRoastDraft(supabase, gameId);
  await handleGameFinalized(supabase, gameId);
  await revalidateGamePaths(gameId, game.season_id);
  revalidatePath("/admin/locker-room");
  revalidatePath("/locker-room");
  return actionSuccess(he.admin.liveStats.finished, `/admin/games/${gameId}?step=highlights`);
}

/**
 * Undo for a mistaken "finish": a final game goes back to live so scoring can continue. The final-score push is
 * claimed once per game (`final_push_sent_at`), so finishing again will not notify fans a second time.
 */
export async function reopenLiveGameAction(gameId: number): Promise<ActionResult> {
  await requireAdmin();
  const demoBlock = blockLiveDemoMutation();
  if (demoBlock) return demoBlock;

  if (!gameId || !Number.isInteger(gameId)) return actionFail(he.errors.notFound, "not_found");

  const supabase = await createSessionClient();
  const { data: game, error: loadError } = await supabase.from("games").select("season_id, status").eq("id", gameId).single();
  if (loadError || !game) return mapErrorToAction(loadError ?? { message: "missing" });
  if (game.status !== "final") return actionFail(he.admin.liveStats.reopenNotFinal, "validation");

  const { data: reopened, error: updateError } = await supabase
    .from("games")
    .update({ status: "live" })
    .eq("id", gameId)
    .eq("status", "final")
    .select("id")
    .maybeSingle();
  if (updateError) return mapErrorToAction(updateError);
  if (!reopened) return actionFail(he.admin.liveStats.reopenNotFinal, "validation");

  await revalidateGamePaths(gameId, game.season_id);
  return actionSuccess(he.admin.liveStats.reopened);
}

/** Latest play-by-play of a game for the scorer's "מהלכים" sheet (newest first). Read-only; the scorer sees what fans see. */
export async function getLiveGameEventsAction(gameId: number): Promise<GameEvent[] | null> {
  await requireAdmin();
  if (!Number.isInteger(gameId) || gameId <= 0) return null;
  try {
    const data = await getAdminData();
    return await data.getGameEvents(gameId, 200);
  } catch {
    return null;
  }
}
