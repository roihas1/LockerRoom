"use client";

import { useState } from "react";
import { StatTile } from "@/components/common/stat-tile";
import { he } from "@/config/strings";
import { opponentScoringFromEvents, scoringFromEvents, type ScoringFromEvents } from "@/lib/stats/scoring-from-events";
import { formatTime } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import { formatInt } from "@/lib/utils/numbers";
import type { GameEvent, Player } from "@/types/domain";

/** First paint stays short; older events expand on demand (newest first). */
const PAGE_SIZE = 40;

const eventEmoji: Record<GameEvent["kind"], string> = {
  points: "🏀",
  rebound: "🙌",
  assist: "🎯",
  steal: "🥷",
  block: "🚫",
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
  const [visible, setVisible] = useState(PAGE_SIZE);
  const byId = new Map(players.map((p) => [p.id, p]));
  if (events.length === 0) return <p className="card p-5 text-sm text-muted">{he.live.noEvents}</p>;

  const us = scoringFromEvents(events);
  const them = opponentScoringFromEvents(events);
  const hasUs = us.ft + us.two + us.three > 0;
  const hasThem = them.ft + them.two + them.three > 0;
  const shown = events.slice(0, visible);
  const hasMore = visible < events.length;

  return (
    <div className="space-y-3">
      {hasUs || hasThem ? (
        <div className="space-y-3">
          <p className="text-xs text-muted">{he.live.scoringFromEvents}</p>
          {hasUs ? <ScoringRow title={he.live.scoringUs} scoring={us} /> : null}
          {hasThem ? <ScoringRow title={he.live.scoringOpponent} scoring={them} /> : null}
        </div>
      ) : null}
      <ol className="card divide-y divide-border overflow-hidden" aria-live="polite">
        {shown.map((event) => {
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
      {hasMore ? (
        <div className="flex flex-col items-center gap-1.5">
          <p className="text-xs text-muted">{he.live.showingOf(shown.length, events.length)}</p>
          <button
            type="button"
            onClick={() => setVisible((n) => Math.min(n + PAGE_SIZE, events.length))}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-team hover:bg-team/10"
          >
            {he.live.showMore}
          </button>
        </div>
      ) : events.length > PAGE_SIZE ? (
        <p className="text-center text-xs text-muted">{he.live.showingOf(events.length, events.length)}</p>
      ) : null}
    </div>
  );
}

function ScoringRow({ title, scoring }: { title: string; scoring: ScoringFromEvents }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold">{title}</p>
      <div className="grid grid-cols-3 gap-2">
        <StatTile value={formatInt(scoring.ft)} label={he.stats.ft} sublabel="FT" size="sm" />
        <StatTile value={formatInt(scoring.two)} label={he.live.twos} sublabel={he.live.twosAbbr} size="sm" />
        <StatTile value={formatInt(scoring.three)} label={he.stats.three} sublabel="3PT" size="sm" />
      </div>
    </div>
  );
}
