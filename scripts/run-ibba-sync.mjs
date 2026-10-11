#!/usr/bin/env node
/**
 * Manual IBBA sync (schedule or scouting). Requires PUSH_DISPATCH_SECRET in env.
 * IBBA_SYNC_URL optional — defaults to ${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ibba-sync
 */
const mode = process.argv[2] === "scouting" ? "scouting" : "schedule";
const secret = process.env.PUSH_DISPATCH_SECRET;
const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const url =
  process.env.IBBA_SYNC_URL?.trim() ||
  (base ? `${base}/functions/v1/ibba-sync` : null);

if (!secret || !url) {
  console.error("Need PUSH_DISPATCH_SECRET and NEXT_PUBLIC_SUPABASE_URL or IBBA_SYNC_URL");
  process.exit(1);
}

console.log(`POST ${url} mode=${mode} (may take 1–2 min)…`);
const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-push-secret": secret },
  body: JSON.stringify({ mode }),
});
const text = await res.text();
console.log(res.status, text);
process.exit(res.ok ? 0 : 1);
