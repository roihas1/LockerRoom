import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { he } from "@/config/strings";
import { toGame, toStatLine } from "@/lib/data/mappers";
import { notifyFeedPost } from "@/lib/push/notify";
import { detectMilestones, type Milestone } from "@/lib/stats/milestones";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

function milestoneText(m: Milestone, playerName: string, opponent: string): { title: string; body: string } {
  const t = he.milestones;
  switch (m.kind) {
    case "season_total":
      return { title: t.seasonTotal(playerName, m.value, t.stats[m.stat]), body: t.seasonTotalBody(m.value, t.stats[m.stat], opponent) };
    case "season_high":
      return { title: t.seasonHigh(playerName, m.value, t.stats[m.stat]), body: t.seasonHighBody(opponent) };
    case "team_points":
      return { title: t.teamPoints(m.value), body: t.teamPointsBody(opponent) };
    case "win_streak":
      return { title: t.winStreak(m.count), body: t.winStreakBody(opponent) };
  }
}

/**
 * Publishes milestone/record posts for a final, published game and pushes each new one to the feed topic.
 * `milestone_key` is unique, so re-running never duplicates a post. Never throws; returns how many were new.
 */
export async function createMilestonePosts(client: Client, gameId: number): Promise<number> {
  try {
    const { data: gameRow } = await client.from("games").select("*").eq("id", gameId).maybeSingle();
    if (!gameRow || gameRow.status !== "final" || !gameRow.is_published) return 0;
    const game = toGame(gameRow);

    const { data: seasonGames } = await client.from("games").select("*").eq("season_id", game.seasonId).eq("status", "final").eq("is_published", true);
    const games = (seasonGames ?? []).map(toGame);
    if (games.length === 0) return 0;
    const { data: statRows } = await client
      .from("player_game_stats")
      .select("*")
      .in(
        "game_id",
        games.map((g) => g.id),
      );
    // An excluded game keeps its score/record milestones but contributes no player lines (totals, season highs).
    const excludedIds = new Set(games.filter((g) => g.excludeFromStats).map((g) => g.id));
    const lines = (statRows ?? []).map(toStatLine).filter((l) => !excludedIds.has(l.gameId));
    const milestones = detectMilestones({ seasonId: game.seasonId, gameId, games, lines });
    if (milestones.length === 0) return 0;

    const playerIds = [...new Set(milestones.flatMap((m) => ("playerId" in m ? [m.playerId] : [])))];
    const { data: players } = playerIds.length ? await client.from("players").select("id, name").in("id", playerIds) : { data: [] };
    const names = new Map((players ?? []).map((p) => [p.id, p.name]));
    const { data: auth } = await client.auth.getUser();
    const now = new Date().toISOString();

    const rows = milestones.map((m) => {
      const playerId = "playerId" in m ? m.playerId : null;
      const text = milestoneText(m, playerId ? (names.get(playerId) ?? "") : "", game.opponent);
      return {
        type: "milestone" as const,
        title: text.title,
        body: text.body,
        game_id: gameId,
        milestone_key: m.key,
        milestone_player_id: playerId,
        is_published: true,
        published_at: now,
        created_by: auth.user?.id ?? null,
      };
    });

    const { data: inserted, error } = await client
      .from("locker_room_posts")
      .upsert(rows, { onConflict: "milestone_key", ignoreDuplicates: true })
      .select("id, title");
    if (error) {
      console.error("createMilestonePosts insert failed", error.message);
      return 0;
    }
    for (const post of inserted ?? []) notifyFeedPost(post.id, post.title, { kind: "milestone" });
    return inserted?.length ?? 0;
  } catch (err) {
    console.error("createMilestonePosts failed", err);
    return 0;
  }
}
