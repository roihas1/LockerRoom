"use client";

import { useEffect, useRef, useState } from "react";
import { StatTile } from "@/components/common/stat-tile";
import { he } from "@/config/strings";
import { opponentScoringFromEvents, scoringFromEvents, type ScoringFromEvents } from "@/lib/stats/scoring-from-events";
import { formatTime } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import { formatInt } from "@/lib/utils/numbers";
import type { GameEvent, Player } from "@/types/domain";

/** First paint stays short; older events expand on demand (newest first). */
const PAGE_SIZE = 40;
const FLASH_MS = 1600;

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

function eventCallout(event: GameEvent, playerName: string | null): string {
  const c = he.live.eventCallout;
  const name = playerName ?? "—";
  switch (event.kind) {
    case "points":
      if (event.value === 1) return c.points1(name);
      if (event.value === 2) return c.points2(name);
      if (event.value === 3) return c.points3(name);
      return c.pointsN(name, event.value);
    case "opponent_points":
      if (event.value === 1) return c.opponent_points1;
      if (event.value === 2) return c.opponent_points2;
      if (event.value === 3) return c.opponent_points3;
      return c.opponent_pointsN(event.value);
    case "rebound":
      return c.rebound(name);
    case "assist":
      return c.assist(name);
    case "steal":
      return c.steal(name);
    case "block":
      return c.block(name);
    case "turnover":
      return c.turnover(name);
  }
}

function flashClass(kind: GameEvent["kind"]): string {
  if (kind === "points") return "motion-safe:animate-pbp-flash-win";
  if (kind === "opponent_points") return "motion-safe:animate-pbp-flash-loss";
  return "motion-safe:animate-pbp-flash";
}

export function PlayByPlay({ events, players }: { events: GameEvent[]; players: Player[] }) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [flashIds, setFlashIds] = useState<ReadonlySet<number>>(() => new Set());
  const seenIds = useRef<Set<number> | null>(null);
  const byId = new Map(players.map((p) => [p.id, p]));

  useEffect(() => {
    const ids = events.map((e) => e.id);
    if (seenIds.current === null) {
      // Initial paint: don't flash the whole history.
      seenIds.current = new Set(ids);
      return;
    }
    const fresh = ids.filter((id) => !seenIds.current!.has(id));
    if (fresh.length === 0) return;
    for (const id of ids) seenIds.current.add(id);
    setFlashIds(new Set(fresh));
    const timer = window.setTimeout(() => setFlashIds(new Set()), FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [events]);

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
          const isNew = flashIds.has(event.id);
          const callout = eventCallout(event, player?.name ?? null);
          return (
            <li
              key={event.id}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 text-sm",
                isNew && "motion-safe:animate-pbp-enter",
                isNew && flashClass(event.kind),
              )}
            >
              <span className="num w-12 shrink-0 text-xs text-muted">{formatTime(event.createdAt)}</span>
              <span aria-hidden>{eventEmoji[event.kind]}</span>
              <span data-user-content={!isOpponent || undefined} className="min-w-0 flex-1 font-semibold text-text">
                {callout}
              </span>
              {(event.kind === "points" || event.kind === "opponent_points") && (
                <span
                  className={cn(
                    "num shrink-0 font-bold",
                    event.kind === "points" ? "text-win" : "text-loss",
                  )}
                >
                  {eventLabel(event)}
                </span>
              )}
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
