import "server-only";
import { cache } from "react";
import { aggregateByPlayer, type PlayerAggregate } from "@/lib/stats/aggregate";
import { completedGames } from "@/lib/stats/games";
import type { Game, Player, Season, StatLine } from "@/types/domain";
import { getData } from ".";

export interface SeasonContext {
  season: Season | null;
  seasons: Season[];
  games: Game[];
  completed: Game[];
  lines: StatLine[];
  aggregates: PlayerAggregate[];
  players: Player[];
  playersById: Map<number, Player>;
}

/** Everything season-level pages need, loaded once per request. */
export const getSeasonContext = cache(async (seasonParam?: string): Promise<SeasonContext> => {
  const data = getData();
  const [seasons, active, players] = await Promise.all([data.getSeasons(), data.getActiveSeason(), data.getPlayers({ includeInactive: true })]);
  const season = (seasonParam ? seasons.find((s) => s.slug === seasonParam || String(s.id) === seasonParam) : null) ?? active;
  const [games, lines] = season ? await Promise.all([data.getGames(season.id), data.getSeasonStatLines(season.id)]) : [[], []];
  return {
    season,
    seasons,
    games,
    completed: completedGames(games),
    lines,
    aggregates: [...aggregateByPlayer(lines).values()],
    players,
    playersById: new Map(players.map((p) => [p.id, p])),
  };
});
