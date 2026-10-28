import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { planRemoval, type SnapshotDiff } from "./diff";

type Client = SupabaseClient<Database>;

/** Newest events scanned when taking events back (a whole game is a few hundred taps). */
const REMOVAL_SCAN_LIMIT = 1000;
/** Events considered per player and kind when taking points back; matches what one undo burst can touch. */
const REMOVAL_PER_BUCKET = 50;

type EventKind = SnapshotDiff["inserts"][number]["kind"];

const bucketKey = (kind: string, playerId: number | null) => `${kind}:${playerId ?? "opponent"}`;

/**
 * Writes a snapshot diff to game_events in at most four queries (clear, load, delete, insert), however many
 * stats changed. Play-by-play is a nice-to-have on top of the stats, so failures never fail the live save,
 * but every failing step is logged with the game id and the result tells the caller whether it all landed.
 */
export async function applyEventDiff(client: Client, gameId: number, diff: SnapshotDiff): Promise<boolean> {
  let ok = true;
  const failed = (step: string, error: { message: string } | null) => {
    if (!error) return;
    ok = false;
    console.error(`applyEventDiff ${step} failed (game ${gameId})`, error.message);
  };

  try {
    if (diff.clearedPlayerIds.length) {
      const { error } = await client.from("game_events").delete().eq("game_id", gameId).in("player_id", diff.clearedPlayerIds);
      failed("clear", error);
    }

    const reinserts: { game_id: number; player_id: number | null; kind: EventKind; value: number }[] = [];
    if (diff.removals.length) {
      const kinds = [...new Set(diff.removals.map((r) => r.kind))];
      const { data: events, error: loadError } = await client
        .from("game_events")
        .select("id, value, kind, player_id")
        .eq("game_id", gameId)
        .in("kind", kinds)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(REMOVAL_SCAN_LIMIT);
      failed("load", loadError);

      // Rows arrive newest first, so every bucket keeps that order.
      const buckets = new Map<string, { id: number; value: number }[]>();
      for (const event of events ?? []) {
        const key = bucketKey(event.kind, event.player_id);
        const bucket = buckets.get(key);
        if (bucket) bucket.push({ id: event.id, value: event.value });
        else buckets.set(key, [{ id: event.id, value: event.value }]);
      }

      const deleteIds: number[] = [];
      for (const removal of diff.removals) {
        const bucket = (buckets.get(bucketKey(removal.kind, removal.playerId)) ?? []).slice(0, REMOVAL_PER_BUCKET);
        const plan = planRemoval(bucket, removal.amount);
        deleteIds.push(...plan.deleteIds);
        if (plan.reinsert > 0) reinserts.push({ game_id: gameId, player_id: removal.playerId, kind: removal.kind, value: plan.reinsert });
      }
      if (deleteIds.length) {
        const { error } = await client.from("game_events").delete().in("id", deleteIds);
        failed("remove", error);
      }
    }

    const rows = [...reinserts, ...diff.inserts.map((e) => ({ game_id: gameId, player_id: e.playerId, kind: e.kind, value: e.value }))];
    if (rows.length) {
      const { error } = await client.from("game_events").insert(rows);
      failed("insert", error);
    }
  } catch (err) {
    ok = false;
    console.error(`applyEventDiff threw (game ${gameId})`, err);
  }
  return ok;
}
