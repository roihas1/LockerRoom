import { he } from "@/config/strings";
import type { Game, Player, StatLine } from "@/types/domain";

export interface Roast {
  playerId: number | null;
  text: string;
  /** Higher means funnier (more embarrassing); used to pick the top lines. */
  severity: number;
}

export const MAX_ROASTS_PER_GAME = 5;
export const MAX_ROASTS_PER_PLAYER = 2;

type GameScore = Pick<Game, "teamScore" | "opponentScore">;

function teamRoast(game: GameScore): Roast | null {
  if (game.teamScore == null || game.opponentScore == null) return null;
  const margin = game.teamScore - game.opponentScore;
  if (margin <= -20) return { playerId: null, text: he.fun.roast.bigLoss(-margin), severity: 90 };
  if (margin >= 25) return { playerId: null, text: he.fun.roast.blowout(margin), severity: 40 };
  if (margin > 0 && margin <= 2) return { playerId: null, text: he.fun.roast.closeWin(margin), severity: 60 };
  return null;
}

function playerRoasts(line: StatLine, name: string): Roast[] {
  const out: Roast[] = [];
  const add = (text: string, severity: number) => out.push({ playerId: line.playerId, text, severity });
  const fga = line.fgAttempted ?? 0;
  const fgm = line.fgMade ?? 0;
  const tpa = line.threeAttempted ?? 0;
  const tpm = line.threeMade ?? 0;
  const fta = line.ftAttempted ?? 0;
  const ftm = line.ftMade ?? 0;
  const to = line.turnovers ?? 0;
  const pf = line.fouls ?? 0;

  if (fga >= 5 && fgm === 0) add(he.fun.roast.zeroFg(name, fga), 80 + fga);
  if (tpa >= 5 && tpm / tpa <= 0.2) add(he.fun.roast.threes(name, tpm, tpa), 60 + tpa - tpm);
  if (to >= 4) add(he.fun.roast.turnovers(name, to), 55 + to * 3);
  if (pf >= 5) add(he.fun.roast.fouls(name, pf), 50 + pf);
  if (fta >= 4 && ftm / fta <= 0.4) add(he.fun.roast.freeThrows(name, ftm, fta), 45 + fta - ftm);
  if (line.points >= 15 && fga >= 15 && fgm / fga < 0.35) add(he.fun.roast.volume(name, line.points, fga), 40 + fga - fgm);
  if (line.points === 0 && line.rebounds === 0 && line.assists === 0 && (line.steals ?? 0) === 0 && (line.blocks ?? 0) === 0 && fga + fta === 0) {
    add(he.fun.roast.ghost(name), 30);
  }
  return out;
}

/**
 * Picks the most embarrassing moments of a game as short roast lines.
 * Deterministic: the same stats always produce the same lines in the same order.
 */
export function generateRoasts(lines: StatLine[], playersById: Map<number, Pick<Player, "name" | "nickname">>, game: GameScore): Roast[] {
  const candidates: Roast[] = [];
  for (const line of lines) {
    const player = playersById.get(line.playerId);
    if (!player) continue;
    candidates.push(...playerRoasts(line, player.nickname || player.name));
  }
  candidates.sort((a, b) => b.severity - a.severity || (a.playerId ?? 0) - (b.playerId ?? 0) || a.text.localeCompare(b.text));

  const team = teamRoast(game);
  const picked: Roast[] = team ? [team] : [];
  const perPlayer = new Map<number, number>();
  for (const roast of candidates) {
    if (picked.length >= MAX_ROASTS_PER_GAME) break;
    const id = roast.playerId!;
    const used = perPlayer.get(id) ?? 0;
    if (used >= MAX_ROASTS_PER_PLAYER) continue;
    perPlayer.set(id, used + 1);
    picked.push(roast);
  }
  return picked;
}

/** Post body for the roast draft; empty string when there is nothing worth roasting. */
export function roastPostBody(roasts: Roast[], opponent: string): string {
  if (!roasts.length) return "";
  return [he.fun.roast.intro(opponent), "", ...roasts.map((r) => `🔥 ${r.text}`)].join("\n");
}
