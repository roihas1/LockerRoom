import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toMedia, toPost } from "@/lib/data/mappers";
import type { Database } from "@/types/database";
import type { Post } from "@/types/domain";

type Client = SupabaseClient<Database>;

export async function loadAdminPost(client: Client, id: number): Promise<Post | null> {
  const { data: row, error } = await client.from("locker_room_posts").select("*").eq("id", id).maybeSingle();
  if (error || !row) return null;
  const { data: mediaRows } = await client.from("media").select("*").eq("post_id", id).order("sort_order");
  const media = (mediaRows ?? []).map((m) => toMedia(m));
  return toPost(row, media);
}
