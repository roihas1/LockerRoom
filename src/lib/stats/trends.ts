import type { Game, StatLine } from "@/types/domain";
import { recordGames } from "./games";
import { computePir } from "./pir";

export const HOT_PLAYER_WINDOW = 3;
export const HOT_PLAYER_MIN_APPEARANCES = 2;
export const TREND_WINDOW = 10;
export const ROLLING_WINDOW = 3;

export type PlayerTrendMetric = "points" | "rebounds" | "assists" | "pir";

export interface HotPlayerResult {
  playerId: number;
  /** Appearances in the last HOT_PLAYER_WINDOW team games. */
  gamesPlayed: number;
  /** Size of the team-game window considered (usually 3, fewer early season). */
  windowGames: number;
  avgPir: number;
  avgPoints: number;
  avgRebounds: number;
  avgAssists: number;
  latestPir: number;
}

export interface PlayerTrendPoint {
  gameId: number;
  opponent: string;
  tipoffAt: string;
  points: number;
  rebounds: number;
  assists: number;
  pir: number;
  /** Rolling average of `pir` over up to ROLLING_WINDOW appearances ending at this point. */
  rollingPir: number;
  rollingPoints: number;
  rollingRebounds: number;
  rollingAssists: number;
}

export interface TeamTrendPoint {
  gameId: number;
  opponent: string;
  tipoffAt: string;
  teamScore: number;
  opponentScore: number;
  rollingTeamScore: number;
  rollingOpponentScore: number;
}

function linesByPlayer(lines: StatLine[]): Map<number, StatLine[]> {
  const map = new Map<number, StatLine[]>();
  for (const line of lines) {
    const arr = map.get(line.playerId) ?? [];
    arr.push(line);
    map.set(line.playerId, arr);
  }
  return map;
}

function avg(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function rollingAverage(values: number[], index: number, window = ROLLING_WINDOW): number {
  const start = Math.max(0, index + 1 - window);
  return avg(values.slice(start, index + 1));
}

/** Latest N counted (final + published + non-practice) games, oldest → newest. */
export function recentCountedGames(games: Game[], limit = HOT_PLAYER_WINDOW): Game[] {
  return recordGames(games.filter((g) => !g.excludeFromStats)).slice(-limit);
}

/**
 * Player with the best average PIR across the latest HOT_PLAYER_WINDOW team games.
 * Requires at least HOT_PLAYER_MIN_APPEARANCES appearances in that window.
 */
export function computeHotPlayer(games: Game[], lines: StatLine[]): HotPlayerResult | null {
  const window = recentCountedGames(games, HOT_PLAYER_WINDOW);
  if (window.length < HOT_PLAYER_MIN_APPEARANCES) return null;

  const windowIds = new Set(window.map((g) => g.id));
  const latestId = window[window.length - 1]!.id;
  const byPlayer = linesByPlayer(lines.filter((l) => windowIds.has(l.gameId)));

  let best: HotPlayerResult | null = null;
  for (const [playerId, playerLines] of byPlayer) {
    if (playerLines.length < HOT_PLAYER_MIN_APPEARANCES) continue;

    const pirValues = playerLines.map(computePir);
    const points = playerLines.map((l) => l.points);
    const rebounds = playerLines.map((l) => l.rebounds);
    const assists = playerLines.map((l) => l.assists);
    const latestLine = playerLines.find((l) => l.gameId === latestId);
    const latestPir = latestLine ? computePir(latestLine) : -Infinity;

    const candidate: HotPlayerResult = {
      playerId,
      gamesPlayed: playerLines.length,
      windowGames: window.length,
      avgPir: avg(pirValues),
      avgPoints: avg(points),
      avgRebounds: avg(rebounds),
      avgAssists: avg(assists),
      latestPir,
    };

    if (
      !best ||
      candidate.avgPir > best.avgPir ||
      (candidate.avgPir === best.avgPir && candidate.latestPir > best.latestPir) ||
      (candidate.avgPir === best.avgPir && candidate.latestPir === best.latestPir && candidate.avgPoints > best.avgPoints) ||
      (candidate.avgPir === best.avgPir &&
        candidate.latestPir === best.latestPir &&
        candidate.avgPoints === best.avgPoints &&
        candidate.playerId < best.playerId)
    ) {
      best = candidate;
    }
  }

  return best;
}

/** Latest TREND_WINDOW appearances for a player, chronological, with rolling averages. */
export function buildPlayerTrend(playerId: number, games: Game[], lines: StatLine[], limit = TREND_WINDOW): PlayerTrendPoint[] {
  const counted = recordGames(games);
  const byId = new Map(counted.map((g) => [g.id, g]));
  const appearances = lines
    .filter((l) => l.playerId === playerId && byId.has(l.gameId))
    .map((l) => ({ line: l, game: byId.get(l.gameId)! }))
    .sort((a, b) => a.game.tipoffAt.localeCompare(b.game.tipoffAt))
    .slice(-limit);

  const points = appearances.map(({ line }) => line.points);
  const rebounds = appearances.map(({ line }) => line.rebounds);
  const assists = appearances.map(({ line }) => line.assists);
  const pirs = appearances.map(({ line }) => computePir(line));

  return appearances.map(({ line, game }, i) => ({
    gameId: game.id,
    opponent: game.opponent,
    tipoffAt: game.tipoffAt,
    points: line.points,
    rebounds: line.rebounds,
    assists: line.assists,
    pir: pirs[i]!,
    rollingPir: rollingAverage(pirs, i),
    rollingPoints: rollingAverage(points, i),
    rollingRebounds: rollingAverage(rebounds, i),
    rollingAssists: rollingAverage(assists, i),
  }));
}

/** Latest TREND_WINDOW counted games for the team, chronological, with rolling averages. */
export function buildTeamTrend(games: Game[], limit = TREND_WINDOW): TeamTrendPoint[] {
  const recent = recentCountedGames(games, limit).filter((g) => g.teamScore !== null && g.opponentScore !== null);
  const teamScores = recent.map((g) => g.teamScore!);
  const oppScores = recent.map((g) => g.opponentScore!);

  return recent.map((g, i) => ({
    gameId: g.id,
    opponent: g.opponent,
    tipoffAt: g.tipoffAt,
    teamScore: g.teamScore!,
    opponentScore: g.opponentScore!,
    rollingTeamScore: rollingAverage(teamScores, i),
    rollingOpponentScore: rollingAverage(oppScores, i),
  }));
}

export function metricValue(point: PlayerTrendPoint, metric: PlayerTrendMetric): number {
  return point[metric];
}

export function rollingMetricValue(point: PlayerTrendPoint, metric: PlayerTrendMetric): number {
  switch (metric) {
    case "points":
      return point.rollingPoints;
    case "rebounds":
      return point.rollingRebounds;
    case "assists":
      return point.rollingAssists;
    case "pir":
      return point.rollingPir;
  }
}
