import { emptyLiveLine, type LiveStatsClientState } from "@/lib/live-stats/form-data";
import type { LiveGameSnapshot } from "@/lib/live-stats/types";
import type { Game, StatLine } from "@/types/domain";

export function buildLiveGameSnapshot(game: Game, lines: StatLine[]): LiveGameSnapshot {
  const record: LiveGameSnapshot["lines"] = {};
  for (const line of lines) {
    record[line.playerId] = {
      playerId: line.playerId,
      points: line.points,
      rebounds: line.rebounds,
      assists: line.assists,
      turnovers: line.turnovers ?? 0,
      steals: line.steals ?? 0,
      blocks: line.blocks ?? 0,
    };
  }
  return {
    gameId: game.id,
    status: game.status,
    teamScore: game.teamScore,
    opponentScore: game.opponentScore,
    lines: record,
  };
}

export function clientStateFromSnapshot(snapshot: LiveGameSnapshot): LiveStatsClientState {
  const playedPlayerIds = Object.keys(snapshot.lines).map(Number);
  const lines: LiveStatsClientState["lines"] = {};
  for (const id of playedPlayerIds) {
    lines[id] = { ...snapshot.lines[id]! };
  }
  return {
    playedPlayerIds,
    lines,
    teamScore: snapshot.teamScore ?? 0,
    opponentScore: snapshot.opponentScore ?? 0,
  };
}

export function emptyClientState(): LiveStatsClientState {
  return { playedPlayerIds: [], lines: {}, teamScore: 0, opponentScore: 0 };
}

export function ensureLine(state: LiveStatsClientState, playerId: number): LiveStatsClientState {
  if (state.lines[playerId]) return state;
  return { ...state, lines: { ...state.lines, [playerId]: emptyLiveLine(playerId) } };
}
