"use client";

import { Minus, Plus } from "lucide-react";
import { he } from "@/config/strings";
import { LiveStatsEditableNumber } from "@/components/admin/live-stats/live-stats-editable-number";
import { Button } from "@/components/ui/button";
import { emptyLiveLine, type LiveStatsClientState } from "@/lib/live-stats/form-data";
import type { Player } from "@/types/domain";

/** One stat as a column: a big + on top (the frequent tap), the value, and a smaller − underneath. */
function StatColumn({
  label,
  longLabel,
  value,
  onDec,
  onInc,
  disabled,
}: {
  label: string;
  longLabel: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <Button
        type="button"
        variant="secondary"
        disabled={disabled}
        aria-label={`${he.admin.statsEntry.increment} ${longLabel}`}
        onClick={onInc}
        className="h-12 w-full px-0"
      >
        <Plus aria-hidden className="size-5" />
      </Button>
      <span className="num py-0.5 text-xl leading-none font-bold">{value}</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled || value <= 0}
        aria-label={`${he.admin.statsEntry.decrement} ${longLabel}`}
        onClick={onDec}
        className="w-full border border-border px-0 text-muted"
      >
        <Minus aria-hidden />
      </Button>
    </div>
  );
}

export function LiveStatsPlayerPanel({
  player,
  state,
  onChange,
  disabled,
}: {
  player: Player | null;
  state: LiveStatsClientState;
  onChange: (next: LiveStatsClientState) => void;
  disabled: boolean;
}) {
  if (!player) {
    return <p className="text-sm text-muted">{he.admin.statsEntry.whoPlayedHint}</p>;
  }

  const line = state.lines[player.id] ?? emptyLiveLine(player.id);

  const patchLine = (patch: Partial<typeof line>, teamDelta = 0) => {
    onChange({
      ...state,
      teamScore: Math.max(0, state.teamScore + teamDelta),
      lines: { ...state.lines, [player.id]: { ...line, ...patch } },
    });
  };

  const bump = (key: "rebounds" | "assists" | "turnovers" | "steals" | "blocks", delta: number) => {
    patchLine({ [key]: Math.max(0, line[key] + delta) });
  };

  /** Player points and team score move together so the sum check stays meaningful. */
  const setPoints = (next: number) => {
    const points = Math.max(0, next);
    patchLine({ points }, points - line.points);
  };

  const stats = [
    { key: "rebounds", label: he.stats.rebounds, longLabel: he.stats.reboundsLong },
    { key: "assists", label: he.stats.assists, longLabel: he.stats.assistsLong },
    { key: "steals", label: he.stats.steals, longLabel: he.stats.stealsLong },
    { key: "blocks", label: he.stats.blocks, longLabel: he.stats.blocksLong },
    { key: "turnovers", label: he.stats.turnovers, longLabel: he.stats.turnoversLong },
  ] as const;

  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="flex min-w-0 items-center gap-2 font-display text-base font-bold">
          {player.jerseyNumber != null ? <span className="num text-team">#{player.jerseyNumber}</span> : null}
          <span className="truncate" data-user-content>
            {player.name}
          </span>
        </h2>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-xs text-muted">{he.stats.points}</span>
          <LiveStatsEditableNumber
            value={line.points}
            label={he.admin.liveStats.editPlayerPoints}
            disabled={disabled}
            onCommit={setPoints}
            className="text-2xl leading-none font-black"
          />
        </div>
      </div>
      <div className="mb-3 grid grid-cols-4 gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={disabled || line.points <= 0}
          onClick={() => setPoints(line.points - 1)}
          className="num"
        >
          {he.admin.liveStats.subtract1}
        </Button>
        {([1, 2, 3] as const).map((n) => (
          <Button key={n} type="button" variant="secondary" disabled={disabled} onClick={() => setPoints(line.points + n)}>
            {he.admin.statsEntry[`add${n}`]}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {stats.map((s) => (
          <StatColumn
            key={s.key}
            label={s.label}
            longLabel={s.longLabel}
            value={line[s.key]}
            disabled={disabled}
            onDec={() => bump(s.key, -1)}
            onInc={() => bump(s.key, 1)}
          />
        ))}
      </div>
    </section>
  );
}
