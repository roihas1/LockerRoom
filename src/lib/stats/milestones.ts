import type { Game, StatLine } from "@/types/domain";
import { currentStreak, gameResult, isCountedGame } from "./games";

export type MilestoneStat = "points" | "rebounds" | "assists" | "steals" | "threes";

export type Milestone =
  | { kind: "season_total"; key: string; playerId: number; stat: MilestoneStat; value: number }
  | { kind: "season_high"; key: string; playerId: number; stat: MilestoneStat; value: number }
  | { kind: "team_points"; key: string; value: number }
  | { kind: "win_streak"; key: string; count: number };

export const seasonTotalThresholds: Record<MilestoneStat, number[]> = {
  points: [50, 100, 150, 200, 250, 300, 400, 500],
  rebounds: [50, 100, 150, 200],
  assists: [25, 50, 75, 100],
  steals: [25, 50],
  threes: [10, 25, 50],
};

/** A season high only counts when it is a real performance, not 2 points in game two. */
export const seasonHighMinimums: Record<MilestoneStat, number> = {
  points: 15,
  rebounds: 8,
  assists: 5,
  steals: 4,
  threes: 3,
};

/** Records need some history; the first games of a season would otherwise set every record. */
export const MIN_PRIOR_GAMES_FOR_RECORDS = 2;
export const winStreakMarks = [3, 5, 7, 10];

const STATS: MilestoneStat[] = ["points", "rebounds", "assists", "steals", "threes"];

function statValue(line: StatLine, stat: MilestoneStat): number {
  const v = stat === "threes" ? line.threeMade : line[stat];
  return v ?? 0;
}

const byTipoff = (a: Game, b: Game) => a.tipoffAt.localeCompare(b.tipoffAt) || a.id - b.id;

/**
 * Milestones earned in `gameId`. Only the most recent counted game of the season produces milestones,
 * so re-saving an old game never posts retroactive "news". Keys are stable for idempotent posting.
 */
export function detectMilestones(input: { seasonId: number; gameId: number; games: Game[]; lines: StatLine[] }): Milestone[] {
  const { seasonId, gameId } = input;
  const counted = input.games.filter((g) => g.seasonId === seasonId && isCountedGame(g)).sort(byTipoff);
  const game = counted.find((g) => g.id === gameId);
  if (!game || counted.at(-1)?.id !== gameId) return [];

  const priorIds = new Set(counted.filter((g) => g.id !== gameId).map((g) => g.id));
  const priorLines = input.lines.filter((l) => priorIds.has(l.gameId));
  const gameLines = input.lines.filter((l) => l.gameId === gameId);
  const hasHistory = priorIds.size >= MIN_PRIOR_GAMES_FOR_RECORDS;
  const out: Milestone[] = [];

  for (const line of gameLines) {
    for (const stat of STATS) {
      const now = statValue(line, stat);
      if (now <= 0) continue;
      const before = priorLines.filter((l) => l.playerId === line.playerId).reduce((s, l) => s + statValue(l, stat), 0);
      const crossed = seasonTotalThresholds[stat].filter((t) => before < t && before + now >= t).at(-1);
      if (crossed) {
        out.push({
          kind: "season_total",
          key: `season:${seasonId}:player:${line.playerId}:${stat}:${crossed}`,
          playerId: line.playerId,
          stat,
          value: crossed,
        });
      }
    }
  }

  if (hasHistory) {
    for (const stat of STATS) {
      const best = gameLines.reduce<StatLine | null>((top, l) => (!top || statValue(l, stat) > statValue(top, stat) ? l : top), null);
      if (!best) continue;
      const value = statValue(best, stat);
      const previousHigh = priorLines.reduce((m, l) => Math.max(m, statValue(l, stat)), 0);
      if (value >= seasonHighMinimums[stat] && value > previousHigh) {
        out.push({ kind: "season_high", key: `season:${seasonId}:high:${stat}:game:${gameId}`, playerId: best.playerId, stat, value });
      }
    }

    const previousTeamHigh = counted.filter((g) => g.id !== gameId).reduce((m, g) => Math.max(m, g.teamScore ?? 0), 0);
    if (game.teamScore !== null && game.teamScore > previousTeamHigh) {
      out.push({ kind: "team_points", key: `season:${seasonId}:team-points:game:${gameId}`, value: game.teamScore });
    }
  }

  const streak = currentStreak(counted);
  if (gameResult(game) === "win" && streak?.type === "win" && winStreakMarks.includes(streak.count)) {
    out.push({ kind: "win_streak", key: `season:${seasonId}:win-streak:${streak.count}:game:${gameId}`, count: streak.count });
  }

  return out;
}
