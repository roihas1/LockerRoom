import type { LivePlayerTotals } from "@/lib/live-stats/types";

export type LiveStatsClientState = {
  playedPlayerIds: number[];
  lines: Record<number, LivePlayerTotals>;
  teamScore: number;
  opponentScore: number;
};

export function emptyLiveLine(playerId: number): LivePlayerTotals {
  return { playerId, points: 0, rebounds: 0, assists: 0, turnovers: 0, steals: 0, blocks: 0 };
}

export function sumPlayedPoints(state: LiveStatsClientState): number {
  return state.playedPlayerIds.reduce((sum, id) => sum + (state.lines[id]?.points ?? 0), 0);
}

export function buildLiveStatsFormData(gameId: number, state: LiveStatsClientState): FormData {
  const fd = new FormData();
  fd.set("gameId", String(gameId));
  for (const playerId of state.playedPlayerIds) {
    fd.append("playedPlayerIds", String(playerId));
    const line = state.lines[playerId] ?? emptyLiveLine(playerId);
    fd.set(`points_${playerId}`, String(line.points));
    fd.set(`rebounds_${playerId}`, String(line.rebounds));
    fd.set(`assists_${playerId}`, String(line.assists));
    fd.set(`turnovers_${playerId}`, String(line.turnovers));
    fd.set(`steals_${playerId}`, String(line.steals));
    fd.set(`blocks_${playerId}`, String(line.blocks));
  }
  fd.set("teamScore", String(state.teamScore));
  fd.set("opponentScore", String(state.opponentScore));
  return fd;
}

export function cloneLiveStatsState(state: LiveStatsClientState): LiveStatsClientState {
  return {
    playedPlayerIds: [...state.playedPlayerIds],
    lines: Object.fromEntries(Object.entries(state.lines).map(([k, v]) => [Number(k), { ...v }])),
    teamScore: state.teamScore,
    opponentScore: state.opponentScore,
  };
}
