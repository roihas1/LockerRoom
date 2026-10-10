import Link from "next/link";
import { MapPin } from "lucide-react";
import { ResultBadge } from "@/components/common/result-badge";
import { OpponentBadge } from "@/components/common/team-logo";
import { homeAwayLabels } from "@/config/labels";
import { he } from "@/config/strings";
import { gameResult, isUpcomingGame } from "@/lib/stats/games";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatGameMoment } from "@/lib/utils/dates";
import type { Game } from "@/types/domain";
import { WazeButton } from "./waze-button";

export function GameCard({ game, teamShortName, compact = false }: { game: Game; teamShortName: string; compact?: boolean }) {
  const result = gameResult(game);
  const hasScore = game.teamScore !== null && game.opponentScore !== null;
  return (
    <div
      className={cn(
        "card group relative overflow-hidden transition-colors hover:border-team/50",
        result === "win" && "border-s-4 border-s-win",
        result === "loss" && "border-s-4 border-s-loss",
      )}
    >
      <Link href={`/games/${game.id}`} className="block p-4">
        <div className="mb-3 flex items-center justify-between gap-2 text-xs text-muted">
          <span className="font-semibold">
            {game.roundNumber ? he.games.round(game.roundNumber) : null}
            {game.roundNumber ? " · " : null}
            {homeAwayLabels[game.homeAway]}
          </span>
          <ResultBadge game={game} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <OpponentBadge name={game.opponent} className="size-11 text-lg" />
            <div className="min-w-0">
              <p className="text-xs text-muted">{he.result.vs}</p>
              <p data-user-content className="truncate font-display text-lg font-extrabold">
                {game.opponent}
              </p>
            </div>
          </div>
          {hasScore ? (
            <bdi dir="ltr" className="num shrink-0 text-3xl font-black">
              <span className={result === "win" ? "text-text" : "text-muted"}>{game.teamScore}</span>
              <span className="mx-1 text-muted">:</span>
              <span className={result === "loss" ? "text-text" : "text-muted"}>{game.opponentScore}</span>
            </bdi>
          ) : (
            <span className="shrink-0 text-end text-sm font-semibold text-team">{formatGameMoment(game.tipoffAt)}</span>
          )}
        </div>
        {!compact ? (
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted">
            <span className="flex min-w-0 items-center gap-1">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              <span data-user-content className="truncate">
                {game.location}
              </span>
            </span>
            <span className="num shrink-0">{formatDate(game.tipoffAt)}</span>
          </div>
        ) : null}
        <span className="sr-only">{teamShortName}</span>
      </Link>
      {!compact && game.location && isUpcomingGame(game) ? (
        <div className="px-4 pb-4">
          <WazeButton address={game.location} />
        </div>
      ) : null}
    </div>
  );
}
