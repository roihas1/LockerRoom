import { getSiteUrl } from "@/config/site";
import { buildIcs, gameCalendarEvent } from "@/lib/calendar";
import { getData } from "@/lib/data";

export async function GET() {
  const data = getData();
  const [team, season] = await Promise.all([data.getTeam(), data.getActiveSeason()]);
  const games = season ? await data.getGames(season.id) : [];
  const siteUrl = getSiteUrl();

  const ics = buildIcs(
    games.map((game) => gameCalendarEvent(game, team, siteUrl)),
    new Date(),
    team.name,
  );
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="games.ics"',
      "Cache-Control": "public, max-age=900",
    },
  });
}
