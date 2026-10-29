import { gameStatusLabels, homeAwayLabels } from "@/config/labels";
import { he } from "@/config/strings";
import { getData } from "@/lib/data";
import { OG_SIZE, renderShareCard } from "@/lib/og/card";
import { gameResult, weAreOnRight } from "@/lib/stats/games";
import { formatLongDate, formatTime } from "@/lib/utils/dates";
import { parseId } from "@/lib/utils/params";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = he.nav.games;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const id = parseId((await params).id);
  const data = getData();
  const [game, team] = await Promise.all([id ? data.getGame(id) : null, data.getTeam()]);
  if (!game) return renderShareCard({ title: team.name, subtitle: he.meta.defaultDescription });

  const result = gameResult(game);
  const hasScore = game.teamScore !== null && game.opponentScore !== null;
  const when = `${formatLongDate(game.tipoffAt)} · ${formatTime(game.tipoffAt)}`;
  const badge =
    game.status === "live"
      ? { text: he.live.badge, tone: "live" as const }
      : result === "win"
        ? { text: he.result.win, tone: "win" as const }
        : result === "loss"
          ? { text: he.result.loss, tone: "loss" as const }
          : { text: gameStatusLabels[game.status], tone: "team" as const };

  return renderShareCard({
    eyebrow: [game.isCup ? he.games.cup : game.roundNumber ? he.games.round(game.roundNumber) : null, homeAwayLabels[game.homeAway]]
      .filter(Boolean)
      .join(" · "),
    title: `${he.result.vs} ${game.opponent}`,
    subtitle: [when, game.location].filter(Boolean).join(" · "),
    badge,
    score:
      hasScore && game.status !== "scheduled"
        ? { team: game.teamScore!, opponent: game.opponentScore!, teamName: team.shortName, opponentName: game.opponent, teamOnRight: weAreOnRight(game) }
        : undefined,
  });
}
