import type { Player, StatLine } from "@/types/domain";

export type StatRowState = {
  playerId: number;
  played: boolean;
  points: number;
  rebounds: number;
  assists: number;
  steals: number | null;
  blocks: number | null;
  turnovers: number | null;
  fouls: number | null;
  fgMade: number | null;
  fgAttempted: number | null;
  threeMade: number | null;
  threeAttempted: number | null;
  ftMade: number | null;
  ftAttempted: number | null;
};

export function emptyRow(playerId: number, played: boolean, line?: StatLine): StatRowState {
  return {
    playerId,
    played,
    points: line?.points ?? 0,
    rebounds: line?.rebounds ?? 0,
    assists: line?.assists ?? 0,
    steals: line?.steals ?? null,
    blocks: line?.blocks ?? null,
    turnovers: line?.turnovers ?? null,
    fouls: line?.fouls ?? null,
    fgMade: line?.fgMade ?? null,
    fgAttempted: line?.fgAttempted ?? null,
    threeMade: line?.threeMade ?? null,
    threeAttempted: line?.threeAttempted ?? null,
    ftMade: line?.ftMade ?? null,
    ftAttempted: line?.ftAttempted ?? null,
  };
}

export function buildInitialRows(players: Player[], playedIds: number[], linesByPlayer: Map<number, StatLine>): StatRowState[] {
  const played = new Set(playedIds);
  return players.map((p) => emptyRow(p.id, played.has(p.id), linesByPlayer.get(p.id)));
}

export function sumPlayedPoints(rows: StatRowState[]): number {
  return rows.filter((r) => r.played).reduce((s, r) => s + r.points, 0);
}

export function rowsEqual(a: StatRowState[], b: StatRowState[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
