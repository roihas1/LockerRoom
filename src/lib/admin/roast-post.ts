import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { he } from "@/config/strings";
import { toGame, toStatLine } from "@/lib/data/mappers";
import { generateRoasts, roastPostBody } from "@/lib/fun/roasts";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export type RoastDraftStatus = "created" | "updated" | "exists" | "published" | "empty" | "failed";

export async function findRoastPost(
  client: Client,
  gameId: number,
): Promise<{ id: number; isPublished: boolean; body: string | null } | null> {
  const { data } = await client
    .from("locker_room_posts")
    .select("id, is_published, body")
    .eq("game_id", gameId)
    .eq("type", "funny_moment")
    .eq("title", he.fun.roast.title)
    .order("id")
    .limit(1)
    .maybeSingle();
  return data ? { id: data.id, isPublished: data.is_published, body: data.body } : null;
}

/**
 * Creates (or with `regenerate`, refreshes) the unpublished roast post for a final game.
 * Idempotent and never throws, so callers can fire it after finishing a game without risk.
 * Published roasts are never touched.
 */
export async function createRoastDraft(client: Client, gameId: number, opts: { regenerate?: boolean } = {}): Promise<RoastDraftStatus> {
  try {
    const existing = await findRoastPost(client, gameId);
    if (existing?.isPublished) return "published";
    if (existing && !opts.regenerate) return "exists";

    const [gameRes, statsRes] = await Promise.all([
      client.from("games").select("*").eq("id", gameId).single(),
      client.from("player_game_stats").select("*").eq("game_id", gameId),
    ]);
    if (gameRes.error || statsRes.error) return "failed";
    const game = toGame(gameRes.data);
    if (game.status !== "final") return "failed";

    const lines = statsRes.data.map(toStatLine);
    const { data: playerRows, error: playersError } = await client
      .from("players")
      .select("id, name, nickname")
      .in("id", lines.length ? lines.map((l) => l.playerId) : [0]);
    if (playersError) return "failed";
    const playersById = new Map(playerRows.map((p) => [p.id, { name: p.name, nickname: p.nickname }]));

    const body = roastPostBody(generateRoasts(lines, playersById, game), game.opponent);
    if (!body) return "empty";

    const { data: auth } = await client.auth.getUser();
    if (existing) {
      const { error } = await client.from("locker_room_posts").update({ body }).eq("id", existing.id);
      return error ? "failed" : "updated";
    }
    const { error } = await client.from("locker_room_posts").insert({
      type: "funny_moment",
      title: he.fun.roast.title,
      body,
      game_id: gameId,
      is_published: false,
      created_by: auth.user?.id ?? null,
    });
    return error ? "failed" : "created";
  } catch {
    return "failed";
  }
}
