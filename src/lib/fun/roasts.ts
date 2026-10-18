import { he } from "@/config/strings";
import { computePir } from "@/lib/stats/pir";
import type { Game, Player, StatLine } from "@/types/domain";

export type RoastTone = "roast" | "praise";

export interface Roast {
  playerId: number | null;
  text: string;
  tone: RoastTone;
  /** Higher means more noteworthy; used to pick the top lines. */
  severity: number;
}

export interface ParsedRoastLine {
  playerId: number | null;
  tone: RoastTone;
  text: string;
}

export interface ParsedRoastBody {
  intro: string | null;
  lines: ParsedRoastLine[];
  /** True when the body uses the structured `@id:tone:` format. */
  structured: boolean;
}

export const MAX_ROASTS_PER_GAME = 5;
export const MAX_ROASTS_PER_PLAYER = 2;

type GameScore = Pick<Game, "teamScore" | "opponentScore">;

/** Stable 0..n-1 pick from a seed string. */
export function pickVariantIndex(seed: string, count: number): number {
  if (count <= 1) return 0;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % count;
}

function pick<T>(variants: readonly T[], seed: string): T {
  return variants[pickVariantIndex(seed, variants.length)]!;
}

function teamRoast(game: GameScore, seed: string): Roast | null {
  if (game.teamScore == null || game.opponentScore == null) return null;
  const margin = game.teamScore - game.opponentScore;
  const t = he.fun.roast;
  if (margin <= -20) return { playerId: null, text: pick(t.bigLoss, seed)(-margin), tone: "roast", severity: 90 };
  if (margin < 0 && margin >= -3) return { playerId: null, text: pick(t.closeLoss, seed)(-margin), tone: "roast", severity: 70 };
  if (margin >= 25) return { playerId: null, text: pick(t.blowout, seed)(margin), tone: "roast", severity: 40 };
  if (margin > 0 && margin <= 2) return { playerId: null, text: pick(t.closeWin, seed)(margin), tone: "roast", severity: 60 };
  return null;
}

function playerRoasts(line: StatLine, name: string, seed: string): Roast[] {
  const out: Roast[] = [];
  const add = (text: string, severity: number, tone: RoastTone = "roast") =>
    out.push({ playerId: line.playerId, text, severity, tone });
  const t = he.fun.roast;
  const fga = line.fgAttempted ?? 0;
  const fgm = line.fgMade ?? 0;
  const tpa = line.threeAttempted ?? 0;
  const tpm = line.threeMade ?? 0;
  const fta = line.ftAttempted ?? 0;
  const ftm = line.ftMade ?? 0;
  const to = line.turnovers ?? 0;
  const pf = line.fouls ?? 0;
  const prod = line.points + line.rebounds + line.assists;
  const s = `${seed}:${line.playerId}`;

  if (fga >= 5 && fgm === 0) add(pick(t.zeroFg, `${s}:zfg`)(name, fga), 80 + fga);
  if (tpa >= 4 && tpm === 0) add(pick(t.airball, `${s}:air`)(name, tpa), 65 + tpa);
  else if (tpa >= 5 && tpm / tpa <= 0.2) add(pick(t.threes, `${s}:3`)(name, tpm, tpa), 60 + tpa - tpm);
  if (to >= 4) add(pick(t.turnovers, `${s}:to`)(name, to), 55 + to * 3);
  if (pf >= 5) add(pick(t.fouls, `${s}:pf`)(name, pf), 50 + pf);
  if (fta >= 3 && ftm === 0) add(pick(t.brickFts, `${s}:ft0`)(name, fta), 48 + fta);
  else if (fta >= 4 && ftm / fta <= 0.4) add(pick(t.freeThrows, `${s}:ft`)(name, ftm, fta), 45 + fta - ftm);
  if (line.points >= 15 && fga >= 15 && fgm / fga < 0.35) add(pick(t.volume, `${s}:vol`)(name, line.points, fga), 40 + fga - fgm);
  if (line.rebounds === 0 && fga >= 8) add(pick(t.noBoards, `${s}:reb`)(name, fga), 35 + fga);
  if (line.rebounds >= 8 && line.assists === 0) add(pick(t.boardsNoDimes, `${s}:bnd`)(name, line.rebounds), 42 + line.rebounds);
  if (fga >= 3 && prod <= 2) add(pick(t.ghost, `${s}:gh`)(name), 38 + fga);

  return out;
}

function playerPraises(line: StatLine, name: string, seed: string): Roast[] {
  const pir = computePir(line);
  if (pir < 22 && !(line.points >= 18 && line.rebounds >= 5) && !(line.points >= 15 && line.assists >= 5)) return [];
  const text = pick(he.fun.roast.praise, `${seed}:${line.playerId}:pr`)(name, line.points, line.rebounds, line.assists);
  return [{ playerId: line.playerId, text, tone: "praise", severity: 30 + pir }];
}

/**
 * Picks the most embarrassing (and on wins, a few bright) moments of a game.
 * Deterministic: the same stats always produce the same lines in the same order.
 */
export function generateRoasts(
  lines: StatLine[],
  playersById: Map<number, Pick<Player, "name" | "nickname">>,
  game: GameScore,
): Roast[] {
  const seed = `${game.teamScore ?? "x"}-${game.opponentScore ?? "x"}-${lines.map((l) => l.playerId).sort((a, b) => a - b).join(",")}`;
  const candidates: Roast[] = [];
  const praisePool: Roast[] = [];
  const won = game.teamScore != null && game.opponentScore != null && game.teamScore > game.opponentScore;

  for (const line of lines) {
    const player = playersById.get(line.playerId);
    if (!player) continue;
    const name = player.nickname || player.name;
    candidates.push(...playerRoasts(line, name, seed));
    if (won) praisePool.push(...playerPraises(line, name, seed));
  }
  candidates.sort((a, b) => b.severity - a.severity || (a.playerId ?? 0) - (b.playerId ?? 0) || a.text.localeCompare(b.text));
  praisePool.sort((a, b) => b.severity - a.severity || (a.playerId ?? 0) - (b.playerId ?? 0) || a.text.localeCompare(b.text));

  const team = teamRoast(game, seed);
  const picked: Roast[] = team ? [team] : [];
  const perPlayer = new Map<number, number>();

  const tryAdd = (roast: Roast) => {
    if (picked.length >= MAX_ROASTS_PER_GAME) return false;
    if (roast.playerId != null) {
      const used = perPlayer.get(roast.playerId) ?? 0;
      if (used >= MAX_ROASTS_PER_PLAYER) return false;
      perPlayer.set(roast.playerId, used + 1);
    }
    picked.push(roast);
    return true;
  };

  for (const roast of candidates) {
    if (picked.length >= MAX_ROASTS_PER_GAME) break;
    tryAdd(roast);
  }

  // On wins, fill one leftover slot with praise when there is room.
  if (won && picked.length < MAX_ROASTS_PER_GAME) {
    for (const praise of praisePool) {
      if (tryAdd(praise)) break;
    }
  }

  return picked;
}

/** Encode a roast line for storage in the post body (parseable + player-linkable). */
export function formatRoastLine(roast: Roast): string {
  const who = roast.playerId == null ? "t" : String(roast.playerId);
  const tone = roast.tone === "praise" ? "p" : "r";
  return `🔥 @${who}:${tone}:${roast.text}`;
}

const STRUCTURED = /^🔥 @(\d+|t):(r|p):(.+)$/;
const LEGACY_FIRE = /^🔥\s+(.+)$/;

export function parseRoastBody(body: string): ParsedRoastBody {
  const raw = body.trim();
  if (!raw) return { intro: null, lines: [], structured: false };

  const parts = raw.split("\n");
  const lines: ParsedRoastLine[] = [];
  let structured = false;
  const introParts: string[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const m = trimmed.match(STRUCTURED);
    if (m) {
      structured = true;
      lines.push({
        playerId: m[1] === "t" ? null : Number(m[1]),
        tone: m[2] === "p" ? "praise" : "roast",
        text: m[3]!,
      });
      continue;
    }
    const legacy = trimmed.match(LEGACY_FIRE);
    if (legacy) {
      lines.push({ playerId: null, tone: "roast", text: legacy[1]! });
      continue;
    }
    if (lines.length === 0) introParts.push(trimmed);
  }

  return {
    intro: introParts.length ? introParts.join("\n") : null,
    lines,
    structured,
  };
}

export function isRoastPost(post: { type: string; title: string | null }): boolean {
  return post.type === "funny_moment" && post.title === he.fun.roast.title;
}

/** Post body for the roast draft; empty string when there is nothing worth roasting. */
export function roastPostBody(roasts: Roast[], opponent: string): string {
  if (!roasts.length) return "";
  return [he.fun.roast.intro(opponent), "", ...roasts.map(formatRoastLine)].join("\n");
}
