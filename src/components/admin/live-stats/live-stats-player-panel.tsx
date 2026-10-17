"use client";

import { Minus, Plus } from "lucide-react";
import { he } from "@/config/strings";
import { LiveStatsEditableNumber } from "@/components/admin/live-stats/live-stats-editable-number";
import { Button } from "@/components/ui/button";
import { emptyLiveLine, type LiveStatsClientState } from "@/lib/live-stats/form-data";
import type { Player } from "@/types/domain";

function StatStepper({
  label,
  value,
  onDec,
  onInc,
  disabled,
}: {
  label: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          disabled={disabled || value <= 0}
          aria-label={`${he.admin.statsEntry.decrement} ${label}`}
          onClick={onDec}
        >
          <Minus aria-hidden />
        </Button>
        <span className="num min-w-10 text-center text-xl font-bold">{value}</span>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          disabled={disabled}
          aria-label={`${he.admin.statsEntry.increment} ${label}`}
          onClick={onInc}
        >
          <Plus aria-hidden />
        </Button>
      </div>
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

  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
        {player.jerseyNumber != null ? <span className="num text-team">#{player.jerseyNumber}</span> : null}
        <span data-user-content>{player.name}</span>
      </h2>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs text-muted">{he.stats.pointsLong}</span>
        <LiveStatsEditableNumber
          value={line.points}
          label={he.admin.liveStats.editPlayerPoints}
          disabled={disabled}
          onCommit={setPoints}
          className="text-3xl font-black"
        />
      </div>
      <div className="mb-4 grid grid-cols-4 gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={disabled || line.points <= 0}
          onClick={() => setPoints(line.points - 1)}
          className="num"
        >
          {he.admin.liveStats.subtract1}
        </Button>
        {([1, 2, 3] as const).map((n) => (
          <Button key={n} type="button" variant="secondary" size="lg" disabled={disabled} onClick={() => setPoints(line.points + n)}>
            {he.admin.statsEntry[`add${n}`]}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatStepper
          label={he.stats.reboundsLong}
          value={line.rebounds}
          disabled={disabled}
          onDec={() => bump("rebounds", -1)}
          onInc={() => bump("rebounds", 1)}
        />
        <StatStepper
          label={he.stats.assistsLong}
          value={line.assists}
          disabled={disabled}
          onDec={() => bump("assists", -1)}
          onInc={() => bump("assists", 1)}
        />
        <StatStepper
          label={he.stats.stealsLong}
          value={line.steals}
          disabled={disabled}
          onDec={() => bump("steals", -1)}
          onInc={() => bump("steals", 1)}
        />
        <StatStepper
          label={he.stats.blocksLong}
          value={line.blocks}
          disabled={disabled}
          onDec={() => bump("blocks", -1)}
          onInc={() => bump("blocks", 1)}
        />
        <StatStepper
          label={he.stats.turnoversLong}
          value={line.turnovers}
          disabled={disabled}
          onDec={() => bump("turnovers", -1)}
          onInc={() => bump("turnovers", 1)}
        />
      </div>
    </section>
  );
}
