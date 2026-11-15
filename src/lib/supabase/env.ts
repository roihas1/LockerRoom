export function supabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || undefined;
}

export function supabaseAnonKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined;
}

/**
 * Demo mode: no Supabase project configured, so the app serves typed fixtures and disables writes.
 * `DEMO_LIVE_UI=1` forces fixtures even when `.env.local` has Supabase keys (local UI preview; no push).
 */
export function isDemoMode(): boolean {
  if (process.env.DEMO_LIVE_UI === "1") return true;
  return !supabaseUrl() || !supabaseAnonKey();
}
