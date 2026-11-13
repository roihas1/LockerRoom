export type CupClicheStatus = "pending" | "approved" | "rejected";

export type CupClicheWeightBucket = 60 | 80 | 100;

export interface CupCliche {
  id: number;
  body: string;
  saidBy: string;
  weight: number;
  verified: boolean;
  saidOn?: string | null;
  sourceUrl?: string | null;
  status?: CupClicheStatus;
  createdAt?: string;
}

export const CLICHE_WEIGHT_BUCKETS = [
  { weight: 60 as const, key: "low" as const },
  { weight: 80 as const, key: "mid" as const },
  { weight: 100 as const, key: "high" as const },
];

/** Generic attributions like "כל מאמן…" / "קלישאת…" get lower pick priority. */
const GENERIC_SAID_BY = /^(כל |קלישאת)/u;

export function isClicheWeightBucket(value: number): value is CupClicheWeightBucket {
  return value === 60 || value === 80 || value === 100;
}

export function isAttributedCliche(item: Pick<CupCliche, "verified" | "saidBy">): boolean {
  if (item.verified) return true;
  return !GENERIC_SAID_BY.test(item.saidBy.trim());
}

/** Boost named/verified quotes so the generator prefers real speakers. */
export function clichePickWeight(item: Pick<CupCliche, "weight" | "verified" | "saidBy">): number {
  const base = Math.max(1, item.weight);
  if (item.verified) return base * 6;
  if (isAttributedCliche(item)) return base * 4;
  return base;
}

/** Weighted random pick; higher weight = more likely. */
export function pickWeightedCliche<T extends Pick<CupCliche, "weight" | "verified" | "saidBy">>(
  items: readonly T[],
  random = Math.random,
): T | null {
  if (!items.length) return null;
  const total = items.reduce((sum, item) => sum + clichePickWeight(item), 0);
  let ticket = random() * total;
  for (const item of items) {
    ticket -= clichePickWeight(item);
    if (ticket <= 0) return item;
  }
  return items[items.length - 1] ?? null;
}
