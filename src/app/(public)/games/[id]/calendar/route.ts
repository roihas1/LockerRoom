import { getSiteUrl } from "@/config/site";
import { buildIcs, gameCalendarEvent } from "@/lib/calendar";
import { getData } from "@/lib/data";
import { parseId } from "@/lib/utils/params";

export async function GET(_request: Request, ctx: RouteContext<"/games/[id]/calendar">) {
  const id = parseId((await ctx.params).id);
  const data = getData();
  const [game, team] = await Promise.all([id ? data.getGame(id) : null, data.getTeam()]);
  if (!game) return new Response("Not found", { status: 404 });

  const ics = buildIcs(gameCalendarEvent(game, team, getSiteUrl()));
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="game-${game.id}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
