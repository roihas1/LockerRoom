"use server";

import { revalidatePath } from "next/cache";
import { blockDemoMutation } from "@/lib/auth/demo-guard";
import { requireAdmin } from "@/lib/auth/require-admin";
import { he } from "@/config/strings";
import { createSessionClient } from "@/lib/supabase/server";
import { actionFail, actionFromZod, actionSuccess, type ActionResult } from "@/lib/utils/action-result";
import { mapErrorToAction } from "@/lib/utils/errors";
import { parseGameDetailsForm, parseGameHighlightsForm } from "@/lib/validation/game";
import { parseSaveGameStatsForm } from "@/lib/validation/stats";

async function revalidateGamePaths(gameId: number, seasonId: number) {
  revalidatePath("/admin/games");
  revalidatePath(`/admin/games/${gameId}`);
  revalidatePath("/games");
  revalidatePath(`/games/${gameId}`);
  revalidatePath(`/games?season=${seasonId}`);
  revalidatePath("/");
}

export async function saveGameDetailsAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const demoBlock = blockDemoMutation();
  if (demoBlock) return demoBlock;

  const gameIdRaw = formData.get("gameId");
  const gameId = gameIdRaw ? Number(gameIdRaw) : null;
  const parsed = parseGameDetailsForm(formData);
  if (!parsed.success) return actionFromZod(parsed.error);

  const supabase = await createSessionClient();
  const row = {
    season_id: parsed.data.seasonId,
    opponent: parsed.data.opponent,
    round_number: parsed.data.roundNumber,
    tipoff_at: parsed.data.tipoffAt,
    location: parsed.data.location ?? null,
    home_away: parsed.data.homeAway,
    status: parsed.data.status,
    team_score: parsed.data.teamScore,
    opponent_score: parsed.data.opponentScore,
  };

  const result = gameId
    ? await supabase.from("games").update(row).eq("id", gameId).select("id, season_id").single()
    : await supabase.from("games").insert({ ...row, is_published: false }).select("id, season_id").single();

  if (result.error) return mapErrorToAction(result.error);

  const id = result.data.id;
  await revalidateGamePaths(id, result.data.season_id);
  return actionSuccess(he.admin.gameSaved, `/admin/games/${id}?step=stats`);
}

export async function saveGameStats(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const demoBlock = blockDemoMutation();
  if (demoBlock) return demoBlock;

  const parsed = parseSaveGameStatsForm(formData);
  if (!parsed.success) return actionFromZod(parsed.error);

  const { gameId, playedIds, lines } = parsed.data;
  const supabase = await createSessionClient();
  const { data: game, error: loadError } = await supabase.from("games").select("season_id").eq("id", gameId).single();
  if (loadError || !game) return mapErrorToAction(loadError ?? { message: "missing" });

  const rows = lines.map((l) => ({
    game_id: gameId,
    player_id: l.playerId,
    points: l.points,
    rebounds: l.rebounds,
    assists: l.assists,
    steals: l.steals,
    blocks: l.blocks,
    turnovers: l.turnovers,
    fouls: l.fouls,
    fg_made: l.fgMade,
    fg_attempted: l.fgAttempted,
    three_made: l.threeMade,
    three_attempted: l.threeAttempted,
    ft_made: l.ftMade,
    ft_attempted: l.ftAttempted,
  }));

  if (rows.length > 0) {
    const { error: upsertError } = await supabase.from("player_game_stats").upsert(rows, { onConflict: "game_id,player_id" });
    if (upsertError) return mapErrorToAction(upsertError);
  }

  let deleteQuery = supabase.from("player_game_stats").delete().eq("game_id", gameId);
  if (playedIds.length > 0) {
    deleteQuery = deleteQuery.not("player_id", "in", `(${playedIds.join(",")})`);
  }
  const { error: deleteError } = await deleteQuery;
  if (deleteError) return mapErrorToAction(deleteError);

  await revalidateGamePaths(gameId, game.season_id);
  revalidatePath("/stats");
  return actionSuccess(he.admin.statsEntry.saved);
}

export async function saveGameHighlightsAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const demoBlock = blockDemoMutation();
  if (demoBlock) return demoBlock;

  const gameId = Number(formData.get("gameId"));
  if (!gameId) return actionFail(he.errors.notFound, "not_found");

  const parsed = parseGameHighlightsForm(formData);
  if (!parsed.success) return actionFromZod(parsed.error);

  const supabase = await createSessionClient();
  const { data: game, error: loadError } = await supabase.from("games").select("season_id").eq("id", gameId).single();
  if (loadError || !game) return mapErrorToAction(loadError ?? { message: "missing" });

  const { error } = await supabase
    .from("games")
    .update({
      player_of_game_id: parsed.data.playerOfGameId,
      potg_note: parsed.data.potgNote ?? null,
      recap: parsed.data.recap ?? null,
      ...(parsed.data.playOfGameMediaId !== undefined ? { play_of_game_media_id: parsed.data.playOfGameMediaId } : {}),
    })
    .eq("id", gameId);

  if (error) return mapErrorToAction(error);

  await revalidateGamePaths(gameId, game.season_id);
  return actionSuccess(he.admin.saved, `/admin/games/${gameId}?step=review`);
}

export async function publishGameAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const demoBlock = blockDemoMutation();
  if (demoBlock) return demoBlock;

  const gameId = Number(formData.get("gameId"));
  const publish = formData.get("publish") === "true";
  if (!gameId) return actionFail(he.errors.notFound, "not_found");

  const supabase = await createSessionClient();
  const { data: game, error: loadError } = await supabase.from("games").select("season_id").eq("id", gameId).single();
  if (loadError || !game) return mapErrorToAction(loadError ?? { message: "missing" });

  const { error } = await supabase.from("games").update({ is_published: publish }).eq("id", gameId);
  if (error) return mapErrorToAction(error);

  await revalidateGamePaths(gameId, game.season_id);
  return actionSuccess(publish ? he.admin.published : he.admin.draft);
}

export async function deleteGameAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const demoBlock = blockDemoMutation();
  if (demoBlock) return demoBlock;

  const gameId = Number(formData.get("gameId"));
  if (!gameId) return actionFail(he.errors.notFound, "not_found");

  const supabase = await createSessionClient();
  const { data: game } = await supabase.from("games").select("season_id").eq("id", gameId).maybeSingle();
  const { error } = await supabase.from("games").delete().eq("id", gameId);
  if (error) return mapErrorToAction(error);

  revalidatePath("/admin/games");
  revalidatePath("/games");
  revalidatePath("/");
  if (game) revalidatePath(`/games?season=${game.season_id}`);
  return actionSuccess(he.admin.deleted, "/admin/games");
}
