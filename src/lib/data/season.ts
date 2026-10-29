import "server-only";
import { cache } from "react";
import { aggregateByPlayer, type PlayerAggregate } from "@/lib/stats/aggregate";
import { completedGames, statCompletedGames } from "@/lib/stats/games";
import type { Game, Player, Season, StatLine } from "@/types/domain";
import { getData, getFreshData } from ".";
import { anyInLiveWindow } from "./live-window";

export interface SeasonContext {
  season: Season | null;
  seasons: Season[];
  games: Game[];
  completed: Game[];
  /** `completed` minus games flagged "exclude from stats": the denominator for averages and leader minimums. */
  statCompleted: Game[];
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
  let [games, lines] = season ? await Promise.all([data.getGames(season.id), data.getSeasonStatLines(season.id)]) : [[], []];
  if (season && anyInLiveWindow(games)) {
    // Game time: bypass the ~60s cross-request cache so status/score/box score are never stale.
    const fresh = getFreshData();
    [games, lines] = await Promise.all([fresh.getGames(season.id), fresh.getSeasonStatLines(season.id)]);
  }
  return {
    season,
    seasons,
    games,
    completed: completedGames(games),
    statCompleted: statCompletedGames(games),
    lines,
    aggregates: [...aggregateByPlayer(lines).values()],
    players,
    playersById: new Map(players.map((p) => [p.id, p])),
  };
});
