import { he } from "@/config/strings";
import type { StatLine } from "@/types/domain";

/** Simplified team PIR: positives minus turnovers. Null optional stats count as 0. */
export function computePir(line: Pick<StatLine, "points" | "rebounds" | "assists" | "steals" | "blocks" | "turnovers">): number {
  return line.points + line.rebounds + line.assists + (line.steals ?? 0) + (line.blocks ?? 0) - (line.turnovers ?? 0);
}

/** Sort by PIR, then PTS → AST → REB → fewer TO → playerId. */
export function comparePirLines(a: StatLine, b: StatLine): number {
  return (
    computePir(b) - computePir(a) ||
    b.points - a.points ||
    b.assists - a.assists ||
    b.rebounds - a.rebounds ||
    (a.turnovers ?? 0) - (b.turnovers ?? 0) ||
    a.playerId - b.playerId
  );
}

export function pickPotgPlayerId(lines: StatLine[]): number | null {
  if (!lines.length) return null;
  return [...lines].sort(comparePirLines)[0]!.playerId;
}

/** Short manager-facing blurb for the POTG note field. */
export function suggestPotgNote(line: StatLine, playerName: string): string {
  return he.fun.potg.note(playerName, {
    points: line.points,
    rebounds: line.rebounds,
    assists: line.assists,
    pir: computePir(line),
  });
}
