import { he } from "@/config/strings";
import { gameResult } from "@/lib/stats/games";
import { formatDate } from "@/lib/utils/dates";
import type { Exercise, FeedItem, Game, Player, Team } from "@/types/domain";

/** WhatsApp-friendly title and description for a game, e.g. "🏀 Team — ניצחון 82:74". */
export function gameShareText(game: Game, team: Team): { title: string; description: string } {
  const result = gameResult(game);
  const round = game.isCup ? he.games.cup : game.roundNumber ? he.games.round(game.roundNumber) : null;
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

/** Text sent along with a shared link (WhatsApp message / share sheet). */
export const shareMessage = {
  game(game: Game, team: Team): string {
    if (game.status === "live") {
      const score = game.teamScore !== null && game.opponentScore !== null ? `${game.teamScore}:${game.opponentScore}` : he.result.vs;
      return he.share.liveText(team.name, game.opponent, score);
    }
    const share = gameShareText(game, team);
    return `${share.title} · ${share.description}`;
  },
  player: (player: Player, team: Team) => he.share.playerText(player.name, team.name),
  wrapped: (player: Player) => he.share.wrappedText(player.nickname || player.name),
  play: (play: Exercise) => he.share.playText(play.title),
  post: (item: FeedItem) => he.share.postText(item.title ?? item.award?.title ?? item.body?.slice(0, 80) ?? he.locker.title),
  join: (team: Team) => he.share.joinText(team.name),
};
