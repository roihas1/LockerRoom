"use client";

import { he } from "@/config/strings";
import { cn } from "@/lib/utils/cn";
import type { LiveStatsClientState } from "@/lib/live-stats/form-data";
import type { Player } from "@/types/domain";

export function LiveStatsPlayerGrid({
  players,
  state,
  selectedId,
  onSelect,
}: {
  players: Player[];
  state: LiveStatsClientState;
  selectedId: number | null;
  onSelect: (playerId: number) => void;
}) {
  const playedPlayers = players.filter((p) => state.playedPlayerIds.includes(p.id));
  if (playedPlayers.length === 0) return null;

  return (
    <section aria-label={he.admin.liveStats.selectPlayer}>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {playedPlayers.map((p) => {
          const selected = p.id === selectedId;
          const points = state.lines[p.id]?.points ?? 0;
          return (
            <li key={p.id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(p.id)}
                className={cn(
                  "flex w-full flex-col items-center gap-0.5 rounded-xl border-2 bg-surface-2 px-1 py-2 transition-colors",
                  selected ? "border-team bg-team/10" : "border-border hover:border-team/50",
                )}
              >
                <span className="num text-lg leading-none font-black">{p.jerseyNumber ?? "–"}</span>
                <span data-user-content className="w-full truncate text-center text-xs font-medium">
                  {p.name}
                </span>
                <span className="num text-xs text-muted">
                  {points} {he.stats.points}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
