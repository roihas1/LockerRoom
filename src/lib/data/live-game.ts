import "server-only";
import type { Game, GameEvent, Player, StatLine } from "@/types/domain";
import { getFreshData } from ".";

/** Slim live slice: score, box, play-by-play — no media gallery or season. */
export interface LiveGameUpdate {
  game: Game;
  lines: StatLine[];
  events: GameEvent[];
  players: Player[];
}

/**
 * Fresh (uncached) read of the fields the live client island needs.
 * Callers should treat Realtime as a signal and pull this payload, not remount the whole page.
 */
export async function getLiveGameUpdate(gameId: number): Promise<LiveGameUpdate | null> {
  const data = getFreshData();
  const game = await data.getGame(gameId);
  if (!game) return null;

  const [lines, events, roster] = await Promise.all([
    data.getGameLines(gameId),
    data.getGameEvents(gameId),
    data.getPlayers({ includeInactive: true }),
  ]);

  const needed = new Set<number>([
    ...lines.map((l) => l.playerId),
    ...events.flatMap((e) => (e.playerId != null ? [e.playerId] : [])),
    ...(game.playerOfGameId != null ? [game.playerOfGameId] : []),
  ]);
  const players = roster.filter((p) => needed.has(p.id));

  return { game, lines, events, players };
}
