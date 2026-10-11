import Link from "next/link";
import { MapPin } from "lucide-react";
import { ScoreBoard } from "@/components/common/scoreboard";
import { WazeButton } from "@/components/games/waze-button";
import { homeAwayLabels } from "@/config/labels";
import { he } from "@/config/strings";
import { formatGameMoment, formatLongDate } from "@/lib/utils/dates";
import type { Game, Team } from "@/types/domain";
import { Countdown } from "./countdown";

export function NextGameCard({ game, team }: { game: Game; team: Team }) {
  return (
    <div className="card court-bg transition-colors hover:border-team/50">
      <Link href={`/games/${game.id}`} className="block space-y-4 p-5">
        <div className="flex items-center justify-between text-xs text-muted">
          <span className="font-bold tracking-wide text-team">{he.home.nextGame}</span>
          <span>
            {game.roundNumber ? `${he.games.round(game.roundNumber)} · ` : null}
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
        <Countdown to={game.tipoffAt} />
      </Link>
      <div className="flex flex-wrap justify-center gap-2 px-5 pb-5">
        <Link
          href={`/scouting?opponent=${encodeURIComponent(game.opponent)}`}
          className="rounded-xl border border-border px-3 py-2 text-sm font-semibold text-team hover:bg-team/10"
        >
          {he.scoutingPage.viewScouting}
        </Link>
        {game.location ? <WazeButton address={game.location} /> : null}
      </div>
    </div>
  );
}
