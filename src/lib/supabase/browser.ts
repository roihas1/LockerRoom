import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { supabaseAnonKey, supabaseUrl } from "./env";

let client: SupabaseClient<Database> | null = null;

/** Anonymous browser client for Realtime subscriptions. RLS limits it to published content. */
export function getBrowserClient(): SupabaseClient<Database> | null {
  const url = supabaseUrl();
  const key = supabaseAnonKey();
  if (!url || !key) return null;
  client ??= createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
