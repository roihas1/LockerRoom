import { he } from "@/config/strings";
import { gameResult } from "@/lib/stats/games";
import { formatDate } from "@/lib/utils/dates";
import type { Game, Team } from "@/types/domain";

/** WhatsApp-friendly title and description for a game, e.g. "🏀 Team — ניצחון 82:74". */
export function gameShareText(game: Game, team: Team): { title: string; description: string } {
  const result = gameResult(game);
  const round = game.roundNumber ? he.games.round(game.roundNumber) : null;
  if (result && game.teamScore !== null && game.opponentScore !== null) {
    return {
      title: he.meta.gamePreview(team.name, result === "win" ? he.result.win : he.result.loss, `${game.teamScore}:${game.opponentScore}`),
      description: [round, `${he.result.vs} ${game.opponent}`, formatDate(game.tipoffAt)].filter(Boolean).join(" · "),
    };
  }
  return {
    title: `🏀 ${team.name} ${he.result.vs} ${game.opponent}`,
    description: [round, formatDate(game.tipoffAt), game.location].filter(Boolean).join(" · "),
  };
}
