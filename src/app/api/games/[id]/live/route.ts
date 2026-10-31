import { NextResponse } from "next/server";
import { getLiveGameUpdate } from "@/lib/data/live-game";
import { parseId } from "@/lib/utils/params";

/**
 * Slim live game payload for the public game client island.
 * Realtime signals "something changed"; this route is the cheap pull that follows.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/games/[id]/live">) {
  const id = parseId((await ctx.params).id);
  if (!id) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const update = await getLiveGameUpdate(id);
  if (!update) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json(update, {
    headers: {
      // Never cache live scores at the edge.
      "Cache-Control": "private, no-store",
    },
  });
}
