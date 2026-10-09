import { CalendarPlus, Download } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { getSiteUrl } from "@/config/site";
import { he } from "@/config/strings";
import { gameCalendarEvent, googleCalendarUrl } from "@/lib/calendar";
import type { Game, Team } from "@/types/domain";

export function AddToCalendar({ game, team }: { game: Game; team: Team }) {
  const event = gameCalendarEvent(game, team, getSiteUrl());
  return (
    <div role="group" aria-label={he.games.addToCalendar} className="flex flex-wrap justify-center gap-2">
      <a
        href={googleCalendarUrl(event)}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants({ variant: "secondary", size: "sm" })}
      >
        <CalendarPlus aria-hidden />
        {he.games.googleCalendar}
      </a>
      <a href={`/games/${game.id}/calendar`} download className={buttonVariants({ variant: "secondary", size: "sm" })}>
        <Download aria-hidden />
        {he.games.otherCalendar}
      </a>
    </div>
  );
}
