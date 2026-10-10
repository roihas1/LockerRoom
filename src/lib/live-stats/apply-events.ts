import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { planRemoval, type SnapshotDiff } from "./diff";

type Client = SupabaseClient<Database>;

/**
 * Writes a snapshot diff to game_events. Play-by-play is a nice-to-have on top of the stats, so failures
 * are logged and swallowed rather than failing the live save.
 */
export async function applyEventDiff(client: Client, gameId: number, diff: SnapshotDiff): Promise<void> {
  try {
    if (diff.clearedPlayerIds.length) {
      await client.from("game_events").delete().eq("game_id", gameId).in("player_id", diff.clearedPlayerIds);
    }

    const reinserts: { game_id: number; player_id: number | null; kind: (typeof diff.inserts)[number]["kind"]; value: number }[] = [];
    for (const removal of diff.removals) {
      let query = client.from("game_events").select("id, value").eq("game_id", gameId).eq("kind", removal.kind);
      query = removal.playerId === null ? query.is("player_id", null) : query.eq("player_id", removal.playerId);
      const { data: events } = await query.order("created_at", { ascending: false }).order("id", { ascending: false }).limit(50);
      const plan = planRemoval(events ?? [], removal.amount);
      if (plan.deleteIds.length) await client.from("game_events").delete().in("id", plan.deleteIds);
      if (plan.reinsert > 0) reinserts.push({ game_id: gameId, player_id: removal.playerId, kind: removal.kind, value: plan.reinsert });
    }

    const rows = [...reinserts, ...diff.inserts.map((e) => ({ game_id: gameId, player_id: e.playerId, kind: e.kind, value: e.value }))];
    if (rows.length) {
      const { error } = await client.from("game_events").insert(rows);
      if (error) console.error("applyEventDiff insert failed", error.message);
    }
  } catch (err) {
    console.error("applyEventDiff failed", err);
  }
}
