export function supabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || undefined;
}

export function supabaseAnonKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined;
}

/** Demo mode: no Supabase project configured, so the app serves typed fixtures and disables writes. */
export function isDemoMode(): boolean {
  return !supabaseUrl() || !supabaseAnonKey();
}
