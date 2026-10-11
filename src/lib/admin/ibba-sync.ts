import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";

export type IbbaSyncRun = {
  id: number;
  mode: string;
  ranAt: string;
  changes: unknown[];
  error: string | null;
};

export async function getLatestIbbaSyncRun(): Promise<IbbaSyncRun | null> {
  const client = createServiceClient();
  if (!client) return null;
  const { data } = await client
    .from("ibba_sync_runs")
    .select("id, mode, ran_at, changes, error")
    .eq("mode", "schedule")
    .order("ran_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    mode: data.mode,
    ranAt: data.ran_at,
    changes: (data.changes as unknown[]) ?? [],
    error: data.error,
  };
}

/** Edge function URL; explicit env or derived from Supabase project URL. */
export function resolveIbbaSyncUrl(): string | null {
  const explicit = process.env.IBBA_SYNC_URL?.trim();
  if (explicit) return explicit;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  return base ? `${base}/functions/v1/ibba-sync` : null;
}

/** Start ibba-sync without waiting for IBBA (can take ~1–2 min). */
export async function triggerIbbaSync(mode: "schedule" | "scouting" = "schedule"): Promise<boolean> {
  const url = resolveIbbaSyncUrl();
  const secret = process.env.PUSH_DISPATCH_SECRET;
  if (!url || !secret) return false;
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-push-secret": secret },
    body: JSON.stringify({ mode }),
  }).catch(() => null);
  return true;
}
