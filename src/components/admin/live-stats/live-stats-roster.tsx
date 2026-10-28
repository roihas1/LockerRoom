"use client";

import { he } from "@/config/strings";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/form-controls";
import { emptyLiveLine, type LiveStatsClientState } from "@/lib/live-stats/form-data";
import type { Player } from "@/types/domain";

export function LiveStatsRoster({
  players,
  state,
  onChange,
  disabled,
  allowClearAll = true,
}: {
  players: Player[];
  state: LiveStatsClientState;
  onChange: (next: LiveStatsClientState) => void;
  disabled: boolean;
  /** Off while the game is live: wiping the roster would delete the whole box score. */
  allowClearAll?: boolean;
}) {
  const played = new Set(state.playedPlayerIds);

  const setPlayed = (playerId: number, isPlayed: boolean) => {
    if (disabled) return;
    let nextIds = state.playedPlayerIds;
    let nextLines = state.lines;
    if (isPlayed) {
      if (!played.has(playerId)) nextIds = [...state.playedPlayerIds, playerId];
      if (!state.lines[playerId]) nextLines = { ...state.lines, [playerId]: emptyLiveLine(playerId) };
    } else {
      nextIds = state.playedPlayerIds.filter((id) => id !== playerId);
    }
    onChange({ ...state, playedPlayerIds: nextIds, lines: nextLines });
  };

  const selectAll = () => {
    if (disabled) return;
    const ids = players.map((p) => p.id);
    const lines = { ...state.lines };
    for (const id of ids) {
      if (!lines[id]) lines[id] = emptyLiveLine(id);
    }
    onChange({ ...state, playedPlayerIds: ids, lines });
  };

  const clearAll = () => {
    if (disabled) return;
    onChange({ ...state, playedPlayerIds: [] });
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">{he.admin.statsEntry.whoPlayed}</h2>
          <p className="text-sm text-muted">{he.admin.statsEntry.whoPlayedHint}</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={selectAll}>
            {he.admin.statsEntry.selectAll}
          </Button>
          {allowClearAll ? (
            <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={clearAll}>
              {he.admin.statsEntry.clearAll}
            </Button>
          ) : null}
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-2">
        {players.map((p) => (
          <li key={p.id}>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5 has-checked:border-team/60 has-checked:bg-team/10 has-disabled:opacity-50">
              <Checkbox
                checked={played.has(p.id)}
                disabled={disabled}
                onChange={(e) => setPlayed(p.id, e.target.checked)}
              />
              <span className="num w-8 text-center font-black text-team">{p.jerseyNumber ?? "–"}</span>
              <span className="min-w-0 flex-1 truncate font-medium" data-user-content>
                {p.name}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
