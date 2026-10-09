import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { supabaseUrl } from "./env";

/** Service-role client. Bypasses RLS; used only to create Auth users for new admins. */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient<Database>(supabaseUrl()!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
