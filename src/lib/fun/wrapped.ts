import type { PlayerAggregate } from "@/lib/stats/aggregate";
import { gameResult, isCountedGame } from "@/lib/stats/games";
import { computeShameAwards, type ShameCategory } from "@/lib/stats/shame";
import type { Game, StatLine } from "@/types/domain";

export type SignatureStat = "points" | "rebounds" | "assists";

export type WrappedSlide =
  | { kind: "intro"; gp: number }
  | { kind: "points"; total: number; rank: number; teamSize: number }
  | { kind: "bestGame"; gameId: number; opponent: string; points: number; rebounds: number; assists: number }
  | { kind: "record"; wins: number; losses: number }
  | { kind: "signature"; stat: SignatureStat; share: number }
  | { kind: "shame"; categories: ShameCategory[] }
  | { kind: "outro" };

export interface WrappedInput {
  playerId: number;
  games: Game[];
  lines: StatLine[];
  aggregates: PlayerAggregate[];
  completedGames: number;
}

/** Season recap as a short sequence of story slides, or null when the player has not played yet. */
export function buildWrapped({ playerId, games, lines, aggregates, completedGames }: WrappedInput): WrappedSlide[] | null {
  const mine = lines.filter((l) => l.playerId === playerId);
  const agg = aggregates.find((a) => a.playerId === playerId);
  if (!agg || !mine.length) return null;

  const gamesById = new Map(games.map((g) => [g.id, g]));
  const slides: WrappedSlide[] = [{ kind: "intro", gp: agg.gp }];

  const byPoints = [...aggregates].sort((a, b) => b.points - a.points || a.playerId - b.playerId);
  slides.push({ kind: "points", total: agg.points, rank: byPoints.findIndex((a) => a.playerId === playerId) + 1, teamSize: aggregates.length });

  const best = [...mine]
    .filter((l) => gamesById.has(l.gameId))
    .sort((a, b) => b.points - a.points || b.rebounds + b.assists - (a.rebounds + a.assists) || a.gameId - b.gameId)[0];
  if (best) {
    slides.push({
      kind: "bestGame",
      gameId: best.gameId,
      opponent: gamesById.get(best.gameId)!.opponent,
      points: best.points,
      rebounds: best.rebounds,
      assists: best.assists,
    });
  }

  let wins = 0;
  let losses = 0;
  for (const l of mine) {
    const g = gamesById.get(l.gameId);
    if (!g || !isCountedGame(g)) continue;
    const r = gameResult(g);
    if (r === "win") wins++;
    else if (r === "loss") losses++;
  }
  if (wins + losses > 0) slides.push({ kind: "record", wins, losses });

  const shares = (["points", "rebounds", "assists"] as const)
    .map((stat) => {
      const team = aggregates.reduce((s, a) => s + a[stat], 0);
      return { stat, share: team > 0 ? agg[stat] / team : 0 };
    })
    .sort((a, b) => b.share - a.share);
  if (shares[0] && shares[0].share > 0) slides.push({ kind: "signature", ...shares[0] });

  const shame = computeShameAwards(aggregates, completedGames, lines)
    .filter((a) => a.playerId === playerId)
    .map((a) => a.category);
  if (shame.length) slides.push({ kind: "shame", categories: shame });

  slides.push({ kind: "outro" });
  return slides;
}
