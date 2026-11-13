import "server-only";
import seed from "@/fixtures/cup-cliches.json";
import { pickWeightedCliche, type CupCliche } from "@/lib/fun/cliches";
import { isDemoMode } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";

/** One weighted random approved cliché for SSR (home + /cup-cliches). */
export async function loadInitialCupCliche(): Promise<CupCliche | null> {
  if (isDemoMode()) {
    const items = seed.map((row, index) => ({
      id: index + 1,
      body: row.text,
      saidBy: row.saidBy,
      weight: row.weight,
      verified: row.verified,
    }));
    return pickWeightedCliche(items);
  }

  const { data, error } = await createPublicClient().rpc("list_approved_cup_cliches");
  if (error || !data?.length) return null;
  return pickWeightedCliche(
    data.map((row) => ({
      id: row.id,
      body: row.body,
      saidBy: row.said_by,
      weight: row.weight,
      verified: row.verified,
    })),
  );
}
