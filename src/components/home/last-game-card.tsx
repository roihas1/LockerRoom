import Link from "next/link";
import { MediaImage } from "@/components/common/media-image";
import { ResultBadge } from "@/components/common/result-badge";
import { ScoreBoard } from "@/components/common/scoreboard";
import { he } from "@/config/strings";
import { formatLongDate } from "@/lib/utils/dates";
import type { Game, Player, StatLine, Team } from "@/types/domain";

export function LastGameCard({ game, team, potg, potgLine }: { game: Game; team: Team; potg: Player | null; potgLine?: StatLine }) {
  return (
    <Link href={`/games/${game.id}`} className="card block space-y-4 p-5 transition-colors hover:border-team/50">
      <div className="flex items-center justify-between text-xs text-muted">
        <span className="font-bold tracking-wide text-team">{he.home.lastGame}</span>
        <ResultBadge game={game} />
      </div>
      <ScoreBoard game={game} team={team} />
      <p className="text-center text-sm text-muted">{formatLongDate(game.tipoffAt)}</p>
      {potg ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3">
          <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-surface-3">
            <MediaImage media={potg.photo} fallback="/placeholders/player.svg" alt={he.media.playerPhoto(potg.name)} sizes="48px" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted">⭐ {he.games.playerOfGame}</p>
            <p data-user-content className="truncate font-display font-bold">
              {potg.name}
            </p>
          </div>
          {potgLine ? (
            <p className="num ms-auto shrink-0 text-end text-sm font-bold">
              {potgLine.points} {he.stats.points}
              <span className="block text-xs font-medium text-muted">
                {potgLine.rebounds} {he.stats.rebounds} · {potgLine.assists} {he.stats.assists}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}
    </Link>
  );
}
