import { homeAwayLabels } from "@/config/labels";
import { he } from "@/config/strings";
import { gameResult } from "@/lib/stats/games";
import { cn } from "@/lib/utils/cn";
import type { Game, Team } from "@/types/domain";
import { OpponentBadge, TeamLogo } from "./team-logo";

/** Our team is always on the start (right) side; scores sit next to each team name. */
export function ScoreBoard({ game, team, size = "md" }: { game: Game; team: Team; size?: "md" | "lg" }) {
  const result = gameResult(game);
  const hasScore = game.teamScore !== null && game.opponentScore !== null;
  const scoreClass = size === "lg" ? "text-6xl md:text-7xl" : "text-4xl md:text-5xl";
  const logoClass = size === "lg" ? "size-16 md:size-20" : "size-12";

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <div className="flex flex-col items-center gap-2 text-center">
        <TeamLogo team={team} className={logoClass} />
        <span data-user-content className="font-display text-sm font-bold md:text-base">
          {team.name}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {hasScore ? (
          <>
            <span className={cn("num font-black", scoreClass, result === "win" ? "text-text" : "text-muted")}>{game.teamScore}</span>
            <span className="text-2xl text-muted" aria-hidden>
              :
            </span>
            <span className={cn("num font-black", scoreClass, result === "loss" ? "text-text" : "text-muted")}>
              {game.opponentScore}
            </span>
          </>
        ) : (
          <span className="font-display text-2xl font-black text-team">{he.result.vs}</span>
        )}
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <OpponentBadge name={game.opponent} className={cn(logoClass, size === "lg" ? "text-3xl" : "text-xl")} />
        <span data-user-content className="font-display text-sm font-bold md:text-base">
          {game.opponent}
        </span>
      </div>
      <span className="sr-only">{homeAwayLabels[game.homeAway]}</span>
    </div>
  );
}
