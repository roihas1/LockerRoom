import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { he } from "@/config/strings";
import { toGame, toStatLine } from "@/lib/data/mappers";
import { aggregateByPlayer } from "@/lib/stats/aggregate";
import { completedGames } from "@/lib/stats/games";
import { computeLeaders } from "@/lib/stats/leaders";
import { formatAverage } from "@/lib/utils/numbers";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export type PirAwardDraftStatus = "created" | "exists" | "published" | "empty" | "failed";

export async function findSeasonPirAward(
  client: Client,
  seasonId: number,
): Promise<{ id: number; isPublished: boolean } | null> {
  const { data } = await client
    .from("awards")
    .select("id, is_published")
    .eq("season_id", seasonId)
    .eq("title", he.fun.pirAward.title)
    .order("id")
    .limit(1)
    .maybeSingle();
  return data ? { id: data.id, isPublished: data.is_published } : null;
}

/**
 * Creates an unpublished fun award for the season PIR leader.
 * Idempotent: never touches a published award; returns existing unpublished draft.
 */
export async function createSeasonPirAwardDraft(client: Client, seasonId: number): Promise<{ status: PirAwardDraftStatus; awardId?: number }> {
  try {
    const existing = await findSeasonPirAward(client, seasonId);
    if (existing?.isPublished) return { status: "published", awardId: existing.id };
    if (existing) return { status: "exists", awardId: existing.id };

    const [gamesRes, playersRes] = await Promise.all([
      client.from("games").select("*").eq("season_id", seasonId).eq("status", "final").eq("is_published", true),
      client.from("players").select("*"),
    ]);
    if (gamesRes.error || playersRes.error) return { status: "failed" };

    // Games flagged "exclude from stats" never count toward the season PIR award.
    const games = gamesRes.data.map(toGame).filter((g) => !g.excludeFromStats);
    const gameIds = games.map((g) => g.id);
    if (!gameIds.length) return { status: "empty" };

    const statsRes = await client.from("player_game_stats").select("*").in("game_id", gameIds);
    if (statsRes.error) return { status: "failed" };

    const lines = statsRes.data.map(toStatLine);
    const aggregates = [...aggregateByPlayer(lines).values()];
    const boards = computeLeaders(aggregates, completedGames(games).length, { limit: 1, categories: ["pir"] });
    const leader = boards[0]?.entries[0];
    if (!leader) return { status: "empty" };

    const playerRow = playersRes.data.find((p) => p.id === leader.playerId);
    if (!playerRow) return { status: "failed" };
    const name = playerRow.nickname || playerRow.name;

    const { data, error } = await client
      .from("awards")
      .insert({
        season_id: seasonId,
        title: he.fun.pirAward.title,
        emoji: he.fun.pirAward.emoji,
        category: "fun",
        description: he.fun.pirAward.description(name, formatAverage(leader.value)),
        player_id: leader.playerId,
        awarded_on: new Date().toISOString().slice(0, 10),
        is_published: false,
      })
      .select("id")
      .single();

    if (error || !data) return { status: "failed" };
    return { status: "created", awardId: data.id };
  } catch {
    return { status: "failed" };
  }
}
