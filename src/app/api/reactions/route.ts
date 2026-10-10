import { NextResponse } from "next/server";
import { z } from "zod";
import { isReactionKind, toReactionCounts } from "@/lib/reactions";
import { isDemoMode } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";
import type { ReactionCounts } from "@/types/domain";

export type ToggleReactionResult = { ok: true; counts: ReactionCounts } | { ok: false; reason: "demo" | "invalid" | "rate_limited" | "failed" };

const inputSchema = z.object({
  postId: z.number().int().positive(),
  deviceId: z.uuid(),
  kind: z.string().refine(isReactionKind),
});

/**
 * Anonymous reaction toggle. A plain route handler (not a server action) so reacting
 * never goes through the router and never re-renders or transitions the page.
 * The database function validates the post and rate limits the device.
 */
export async function POST(request: Request) {
  const reply = (body: ToggleReactionResult, status = 200) => NextResponse.json(body, { status });
  if (isDemoMode()) return reply({ ok: false, reason: "demo" });

  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return reply({ ok: false, reason: "invalid" }, 400);

  const { data, error } = await createPublicClient().rpc("toggle_reaction", {
    p_post_id: parsed.data.postId,
    p_device_id: parsed.data.deviceId,
    p_emoji: parsed.data.kind,
  });
  if (error) return reply({ ok: false, reason: error.code === "54000" ? "rate_limited" : "failed" }, error.code === "54000" ? 429 : 400);
  return reply({ ok: true, counts: toReactionCounts(data) });
}
