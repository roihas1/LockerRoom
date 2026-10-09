import type { Game, StatLine } from "@/types/domain";

type OptionalKey = "steals" | "blocks" | "turnovers" | "fouls";

export interface OptionalTotal {
  sum: number;
  /** Number of games in which this stat was recorded. */
  games: number;
  perGame: number | null;
}

export interface ShootingTotal {
  made: number;
  attempted: number;
  /** Number of games in which attempts were recorded. */
  games: number;
  pct: number | null;
}

export interface PlayerAggregate {
  playerId: number;
  gp: number;
  points: number;
  rebounds: number;
  assists: number;
  ppg: number | null;
  rpg: number | null;
  apg: number | null;
  steals: OptionalTotal;
  blocks: OptionalTotal;
  turnovers: OptionalTotal;
  fouls: OptionalTotal;
  fg: ShootingTotal;
  three: ShootingTotal;
  ft: ShootingTotal;
}

export function safeDivide(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

function optionalTotal(lines: StatLine[], key: OptionalKey): OptionalTotal {
  let sum = 0;
  let games = 0;
  for (const l of lines) {
    const v = l[key];
    if (v !== null) {
      sum += v;
      games++;
    }
  }
  return { sum, games, perGame: safeDivide(sum, games) };
}

function shootingTotal(lines: StatLine[], made: keyof StatLine, attempted: keyof StatLine): ShootingTotal {
  let m = 0;
  let a = 0;
  let games = 0;
  for (const l of lines) {
    const mv = l[made] as number | null;
    const av = l[attempted] as number | null;
    if (av !== null) {
      a += av;
      m += mv ?? 0;
      games++;
    }
  }
  return { made: m, attempted: a, games, pct: safeDivide(m, a) };
}

export function aggregateLines(playerId: number, lines: StatLine[]): PlayerAggregate {
  const gp = lines.length;
  const points = lines.reduce((s, l) => s + l.points, 0);
  const rebounds = lines.reduce((s, l) => s + l.rebounds, 0);
  const assists = lines.reduce((s, l) => s + l.assists, 0);
  return {
    playerId,
    gp,
    points,
    rebounds,
    assists,
    ppg: safeDivide(points, gp),
    rpg: safeDivide(rebounds, gp),
    apg: safeDivide(assists, gp),
    steals: optionalTotal(lines, "steals"),
    blocks: optionalTotal(lines, "blocks"),
    turnovers: optionalTotal(lines, "turnovers"),
    fouls: optionalTotal(lines, "fouls"),
    fg: shootingTotal(lines, "fgMade", "fgAttempted"),
    three: shootingTotal(lines, "threeMade", "threeAttempted"),
    ft: shootingTotal(lines, "ftMade", "ftAttempted"),
  };
}

/** Keeps only rows from games that count toward statistics (final + published). */
export function countedLines(lines: StatLine[], games: Game[]): StatLine[] {
  const counted = new Set(games.filter((g) => g.status === "final" && g.isPublished).map((g) => g.id));
  return lines.filter((l) => counted.has(l.gameId));
}

export function aggregateByPlayer(lines: StatLine[]): Map<number, PlayerAggregate> {
  const grouped = new Map<number, StatLine[]>();
  for (const l of lines) {
    const arr = grouped.get(l.playerId) ?? [];
    arr.push(l);
    grouped.set(l.playerId, arr);
  }
  const out = new Map<number, PlayerAggregate>();
  for (const [playerId, playerLines] of grouped) out.set(playerId, aggregateLines(playerId, playerLines));
  return out;
}

export interface TeamGameTotals {
  points: number;
  rebounds: number;
  assists: number;
  steals: number | null;
  blocks: number | null;
  turnovers: number | null;
  fouls: number | null;
  fg: ShootingTotal;
  three: ShootingTotal;
  ft: ShootingTotal;
}

function sumOptional(lines: StatLine[], key: OptionalKey): number | null {
  const recorded = lines.filter((l) => l[key] !== null);
  return recorded.length ? recorded.reduce((s, l) => s + (l[key] ?? 0), 0) : null;
}

/** Team totals for one game, derived from the player rows. */
export function teamGameTotals(lines: StatLine[]): TeamGameTotals {
  return {
    points: lines.reduce((s, l) => s + l.points, 0),
    rebounds: lines.reduce((s, l) => s + l.rebounds, 0),
    assists: lines.reduce((s, l) => s + l.assists, 0),
    steals: sumOptional(lines, "steals"),
    blocks: sumOptional(lines, "blocks"),
    turnovers: sumOptional(lines, "turnovers"),
    fouls: sumOptional(lines, "fouls"),
    fg: shootingTotal(lines, "fgMade", "fgAttempted"),
    three: shootingTotal(lines, "threeMade", "threeAttempted"),
    ft: shootingTotal(lines, "ftMade", "ftAttempted"),
  };
}

export interface TeamSeasonAverages {
  gp: number;
  ppg: number | null;
  oppPpg: number | null;
  rpg: number | null;
  apg: number | null;
  spg: number | null;
  bpg: number | null;
  topg: number | null;
  fgPct: number | null;
  threePct: number | null;
  ftPct: number | null;
}

/** Season-level team averages. Scores come from the official game score, the rest from player rows. */
export function teamSeasonAverages(games: Game[], lines: StatLine[]): TeamSeasonAverages {
  const done = games.filter((g) => g.status === "final" && g.isPublished && g.teamScore !== null && g.opponentScore !== null);
  const gp = done.length;
  const byGame = new Map<number, StatLine[]>();
  for (const l of lines) byGame.set(l.gameId, [...(byGame.get(l.gameId) ?? []), l]);
  const totals = done.map((g) => teamGameTotals(byGame.get(g.id) ?? []));
  const perGameOptional = (key: "steals" | "blocks" | "turnovers") => {
    const recorded = totals.map((t) => t[key]).filter((v): v is number => v !== null);
    return safeDivide(recorded.reduce((s, v) => s + v, 0), recorded.length);
  };
  const pct = (key: "fg" | "three" | "ft") =>
    safeDivide(
      totals.reduce((s, t) => s + t[key].made, 0),
      totals.reduce((s, t) => s + t[key].attempted, 0),
    );
  return {
    gp,
    ppg: safeDivide(done.reduce((s, g) => s + (g.teamScore ?? 0), 0), gp),
    oppPpg: safeDivide(done.reduce((s, g) => s + (g.opponentScore ?? 0), 0), gp),
    rpg: safeDivide(totals.reduce((s, t) => s + t.rebounds, 0), gp),
    apg: safeDivide(totals.reduce((s, t) => s + t.assists, 0), gp),
    spg: perGameOptional("steals"),
    bpg: perGameOptional("blocks"),
    topg: perGameOptional("turnovers"),
    fgPct: pct("fg"),
    threePct: pct("three"),
    ftPct: pct("ft"),
  };
}

export type HighKey = "points" | "rebounds" | "assists" | "steals" | "blocks" | "threeMade";

export interface SeasonHigh {
  key: HighKey;
  value: number;
  gameId: number;
}

/** Highest single-game value per stat; stats never recorded are omitted. */
export function seasonHighs(lines: StatLine[]): SeasonHigh[] {
  const keys: HighKey[] = ["points", "rebounds", "assists", "steals", "blocks", "threeMade"];
  const out: SeasonHigh[] = [];
  for (const key of keys) {
    let best: SeasonHigh | null = null;
    for (const l of lines) {
      const v = l[key];
      if (v !== null && (best === null || v > best.value)) best = { key, value: v, gameId: l.gameId };
    }
    if (best && best.value > 0) out.push(best);
  }
  return out;
}

/** Sum of player points for a game; used to warn admins when it differs from the official score. */
export function sumPoints(lines: Pick<StatLine, "points">[]): number {
  return lines.reduce((s, l) => s + l.points, 0);
}
