import type { DataSource } from "@/lib/data/types";
import type { Game, StatLine } from "@/types/domain";

export interface StatsEntryDefaults {
  playedIds: number[];
  linesByPlayer: Map<number, StatLine>;
}

/** Prefill who played and stat rows for the admin stats step. */
export async function getStatsEntryDefaults(data: DataSource, game: Game): Promise<StatsEntryDefaults> {
  const currentLines = await data.getGameLines(game.id);
  if (currentLines.length > 0) {
    return {
      playedIds: currentLines.map((l) => l.playerId),
      linesByPlayer: new Map(currentLines.map((l) => [l.playerId, l])),
    };
  }

  const games = await data.getGames(game.seasonId);
  const previous = games
    .filter((g) => g.id !== game.id && g.status === "final" && g.tipoffAt < game.tipoffAt)
    .sort((a, b) => b.tipoffAt.localeCompare(a.tipoffAt))[0];

  if (previous) {
    const prevLines = await data.getGameLines(previous.id);
    return {
      playedIds: prevLines.map((l) => l.playerId),
      linesByPlayer: new Map(),
    };
  }

  const players = await data.getPlayers({ includeInactive: false });
  return { playedIds: players.map((p) => p.id), linesByPlayer: new Map() };
}
