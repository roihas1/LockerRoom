import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { notifyGameFinalOnce } from "@/lib/push/notify";
import type { Database } from "@/types/database";
import { createMilestonePosts } from "./milestone-posts";

/**
 * Runs once a game is both final and published, from whichever action got it there.
 * Every step is idempotent and never throws, so it is safe to call repeatedly.
 */
export async function handleGameFinalized(client: SupabaseClient<Database>, gameId: number): Promise<{ milestones: number }> {
  const { data: game } = await client.from("games").select("status, is_published").eq("id", gameId).maybeSingle();
  if (!game || game.status !== "final" || !game.is_published) return { milestones: 0 };
  const milestones = await createMilestonePosts(client, gameId);
  await notifyGameFinalOnce(client, gameId);
  return { milestones };
}
