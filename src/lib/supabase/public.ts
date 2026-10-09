import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { supabaseAnonKey, supabaseUrl } from "./env";

/** Cookie-free anon client for public reads. RLS limits it to published content. */
export function createPublicClient() {
  return createClient<Database>(supabaseUrl()!, supabaseAnonKey()!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
