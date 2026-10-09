import { getStatsEntryDefaults, type StatsEntryDefaults } from "@/lib/admin/lineup";
import type { DataSource } from "@/lib/data/types";
import type { LiveGameSnapshot, LivePlayerTotals } from "@/lib/live-stats/types";
import type { Game, Player, StatLine } from "@/types/domain";

export type LiveGamePageData = {
  game: Game;
  players: Player[];
  lines: StatLine[];
  defaults: StatsEntryDefaults;
  snapshot: LiveGameSnapshot;
};

function toLivePlayerTotals(line: StatLine): LivePlayerTotals {
  return {
    playerId: line.playerId,
    points: line.points,
    rebounds: line.rebounds,
    assists: line.assists,
    turnovers: line.turnovers ?? 0,
    steals: line.steals ?? 0,
  };
}

export function buildLiveGameSnapshot(game: Game, lines: StatLine[]): LiveGameSnapshot {
  const record: Record<number, LivePlayerTotals> = {};
  for (const line of lines) {
    record[line.playerId] = toLivePlayerTotals(line);
  }
  return {
    gameId: game.id,
    status: game.status,
    teamScore: game.teamScore,
    opponentScore: game.opponentScore,
    lines: record,
  };
}

/** Admin live scoring page: roster, saved lines, and default lineup prefill. */
export async function getLiveGamePageData(data: DataSource, gameId: number): Promise<LiveGamePageData | null> {
  const game = await data.getGame(gameId);
  if (!game) return null;

  const [players, lines, defaults] = await Promise.all([
    data.getPlayers({ includeInactive: false }),
    data.getGameLines(gameId),
    getStatsEntryDefaults(data, game),
  ]);

  return {
    game,
    players,
    lines,
    defaults,
    snapshot: buildLiveGameSnapshot(game, lines),
  };
}
