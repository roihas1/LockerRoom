import Link from "next/link";
import { MapPin } from "lucide-react";
import { LiveBadge } from "@/components/common/live-badge";
import { ScoreBoard } from "@/components/common/scoreboard";
import { AddToCalendar } from "@/components/games/add-to-calendar";
import { WazeButton } from "@/components/games/waze-button";
import { buttonVariants } from "@/components/ui/button";
import { homeAwayLabels } from "@/config/labels";
import { he } from "@/config/strings";
import { isCalendarEligible } from "@/lib/calendar";
import { gameKindLabel } from "@/lib/stats/games";
import { cn } from "@/lib/utils/cn";
import { formatGameMoment, formatLongDate } from "@/lib/utils/dates";
import type { Game, Team } from "@/types/domain";
import { Countdown } from "./countdown";

export function NextGameCard({ game, team }: { game: Game; team: Team }) {
  const kind = gameKindLabel(game);
  const isLive = game.status === "live";
  return (
    <div
      className={cn(
        "card court-bg transition-colors hover:border-team/50",
        isLive && "border-loss/50 ring-1 ring-loss/30",
      )}
    >
      <Link href={`/games/${game.id}`} className="block space-y-4 p-5">
        <div className="flex items-center justify-between text-xs text-muted">
          {isLive ? <LiveBadge /> : <span className="font-bold tracking-wide text-team">{he.home.nextGame}</span>}
          <span>
            {kind ? `${kind} · ` : null}
            {homeAwayLabels[game.homeAway]}
          </span>
        </div>
        <ScoreBoard game={game} team={team} />
        <div className="space-y-1 text-center">
          <p className="font-display text-lg font-bold">{formatGameMoment(game.tipoffAt)}</p>
          <p className="text-sm text-muted">{formatLongDate(game.tipoffAt)}</p>
          {game.location ? (
            <p className="flex items-center justify-center gap-1 text-sm text-muted">
              <MapPin className="size-3.5" aria-hidden />
              <span data-user-content>{game.location}</span>
            </p>
          ) : null}
        </div>
        {isLive ? (
          <span className={cn(buttonVariants({ variant: "primary", size: "lg" }), "w-full")}>{he.live.watch}</span>
        ) : (
          <Countdown to={game.tipoffAt} />
        )}
      </Link>
      <div className="flex flex-wrap justify-center gap-2 px-5 pb-5">
        <Link
          href={`/scouting?opponent=${encodeURIComponent(game.opponent)}`}
          className="rounded-xl border border-border px-3 py-2 text-sm font-semibold text-team hover:bg-team/10"
        >
          {he.scoutingPage.viewScouting}
        </Link>
        {game.isCup ? (
          <Link
            href="/cup-cliches?suggest=1"
            className="rounded-xl border border-border px-3 py-2 text-sm font-semibold text-team hover:bg-team/10"
          >
            {he.fun.cliche.fromGame}
          </Link>
        ) : null}
        {!isLive && isCalendarEligible(game) ? <AddToCalendar game={game} team={team} /> : null}
        {game.location ? <WazeButton address={game.location} /> : null}
      </div>
    </div>
  );
}
