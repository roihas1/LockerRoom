import { he } from "@/config/strings";
import { formatTime } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import type { GameEvent, Player } from "@/types/domain";

const eventEmoji: Record<GameEvent["kind"], string> = {
  points: "🏀",
  rebound: "🙌",
  assist: "🎯",
  steal: "🥷",
  turnover: "😬",
  opponent_points: "🛡️",
};

function eventLabel(event: GameEvent): string {
  const labels = he.live.event;
  switch (event.kind) {
    case "points":
      return labels.points(event.value);
    case "opponent_points":
      return labels.opponent_points(event.value);
    default: {
      const label = labels[event.kind];
      return event.value > 1 ? `${label} ×${event.value}` : label;
    }
  }
}

export function PlayByPlay({ events, players }: { events: GameEvent[]; players: Player[] }) {
  const byId = new Map(players.map((p) => [p.id, p]));
  if (events.length === 0) return <p className="card p-5 text-sm text-muted">{he.live.noEvents}</p>;

  return (
    <ol className="card divide-y divide-border overflow-hidden" aria-live="polite">
      {events.map((event) => {
        const player = event.playerId ? byId.get(event.playerId) : null;
        const isOpponent = event.kind === "opponent_points";
        return (
          <li key={event.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
            <span className="num w-12 shrink-0 text-xs text-muted">{formatTime(event.createdAt)}</span>
            <span aria-hidden>{eventEmoji[event.kind]}</span>
            <span className="min-w-0 flex-1 truncate font-semibold">
              {isOpponent ? he.live.opponent : <span data-user-content>{player?.name ?? "—"}</span>}
            </span>
            <span className={cn("num shrink-0 font-bold", event.kind === "points" ? "text-win" : isOpponent ? "text-loss" : "text-text")}>
              {eventLabel(event)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
