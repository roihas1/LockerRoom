"use client";

import { he } from "@/config/strings";
import { cn } from "@/lib/utils/cn";
import type { LiveStatsClientState } from "@/lib/live-stats/form-data";
import type { Player } from "@/types/domain";

/** Four compact cells per row: names stay visible together with the stat controls, even with a full roster. */
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
      <ul className="grid grid-cols-4 gap-1.5">
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
                  "flex min-h-[3.25rem] w-full flex-col items-center justify-center gap-0.5 rounded-xl border-2 bg-surface-2 px-1 py-1 transition-colors active:scale-[0.98]",
                  selected ? "border-team bg-team/10" : "border-border hover:border-team/50",
                )}
              >
                <span className="flex items-baseline gap-1.5 leading-none">
                  <span className="num text-base font-black">{p.jerseyNumber ?? "–"}</span>
                  <span className="num text-[11px] font-semibold text-muted">{points}</span>
                </span>
                <span data-user-content className="w-full truncate text-center text-[11px] leading-tight font-medium">
                  {p.name}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
