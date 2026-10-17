"use server";

import { revalidatePath } from "next/cache";
import { he } from "@/config/strings";
import { handleGameFinalized } from "@/lib/admin/game-final";
import { createRoastDraft } from "@/lib/admin/roast-post";
import { applyEventDiff } from "@/lib/live-stats/apply-events";
import { diffSnapshots } from "@/lib/live-stats/diff";
import { notifyGameLive } from "@/lib/push/notify";
import { requireAdmin } from "@/lib/auth/require-admin";
import { isDemoMode } from "@/lib/supabase/env";
import { createSessionClient } from "@/lib/supabase/server";
import { actionFail, actionFromZod, actionSuccess, type ActionResult } from "@/lib/utils/action-result";
import { mapErrorToAction } from "@/lib/utils/errors";
import { parseLiveStatsPayload } from "@/lib/validation/live-stats";

async function revalidateGamePaths(gameId: number, seasonId: number) {
  revalidatePath("/admin/games");
  revalidatePath(`/admin/games/${gameId}`);
  revalidatePath(`/admin/games/${gameId}/live`);
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
  const [{ data: game, error: loadError }, { data: previousRows }] = await Promise.all([
    supabase.from("games").select("season_id, opponent_score").eq("id", gameId).single(),
    supabase.from("player_game_stats").select("player_id, points, rebounds, assists, turnovers, steals, blocks").eq("game_id", gameId),
  ]);
  if (loadError || !game) return mapErrorToAction(loadError ?? { message: "missing" });

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

  let deleteQuery = supabase.from("player_game_stats").delete().eq("game_id", gameId);
  if (playedPlayerIds.length > 0) {
    deleteQuery = deleteQuery.not("player_id", "in", `(${playedPlayerIds.join(",")})`);
  }
  const { error: deleteError } = await deleteQuery;
  if (deleteError) return mapErrorToAction(deleteError);

  const gameUpdate: { status: "live"; team_score?: number; opponent_score?: number } = { status: "live" };
  if (teamScore !== undefined) gameUpdate.team_score = teamScore;
  if (opponentScore !== undefined) gameUpdate.opponent_score = opponentScore;

  const { error: gameError } = await supabase.from("games").update(gameUpdate).eq("id", gameId);
  if (gameError) return mapErrorToAction(gameError);

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

  await revalidateGamePaths(gameId, game.season_id);
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
    .select("season_id, status, opponent, is_published")
    .eq("id", gameId)
    .single();
  if (loadError || !game) return mapErrorToAction(loadError ?? { message: "missing" });

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

  const { error: upsertError } = await supabase.from("player_game_stats").upsert(rows, { onConflict: "game_id,player_id" });
  if (upsertError) return mapErrorToAction(upsertError);

  const { error: statusError } = await supabase.from("games").update({ status: "live" }).eq("id", gameId);
  if (statusError) return mapErrorToAction(statusError);

  if (game.status !== "live") notifyGameLive({ id: gameId, opponent: game.opponent, is_published: game.is_published });
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

  const { error: updateError } = await supabase.from("games").update({ status: "final" }).eq("id", gameId);
  if (updateError) {
    const mapped = mapErrorToAction(updateError);
    if (!mapped.ok && mapped.code === "validation") return mapped;
    return actionFail(he.admin.liveStats.finishTied, "validation");
  }

  await createRoastDraft(supabase, gameId);
  await handleGameFinalized(supabase, gameId);
  await revalidateGamePaths(gameId, game.season_id);
  revalidatePath("/admin/locker-room");
  revalidatePath("/locker-room");
  return actionSuccess(he.admin.liveStats.finished, `/admin/games/${gameId}?step=highlights`);
}
