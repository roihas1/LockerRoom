"use client";

import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { he } from "@/config/strings";
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
  players,
  state,
  onChange,
  disabled,
}: {
  players: Player[];
  state: LiveStatsClientState;
  onChange: (next: LiveStatsClientState) => void;
  disabled: boolean;
}) {
  const playedPlayers = players.filter((p) => state.playedPlayerIds.includes(p.id));
  const [index, setIndex] = useState(0);

  if (playedPlayers.length === 0) {
    return <p className="text-sm text-muted">{he.admin.statsEntry.whoPlayedHint}</p>;
  }

  const safeIndex = Math.min(index, playedPlayers.length - 1);
  const player = playedPlayers[safeIndex]!;
  const line = state.lines[player.id] ?? emptyLiveLine(player.id);

  const patchLine = (patch: Partial<typeof line>, teamDelta = 0) => {
    onChange({
      ...state,
      teamScore: Math.max(0, state.teamScore + teamDelta),
      lines: { ...state.lines, [player.id]: { ...line, ...patch } },
    });
  };

  const bump = (key: "rebounds" | "assists" | "turnovers" | "steals", delta: number) => {
    patchLine({ [key]: Math.max(0, line[key] + delta) });
  };

  const addPoints = (n: number) => {
    patchLine({ points: line.points + n }, n);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={safeIndex <= 0}
          onClick={() => setIndex(safeIndex - 1)}
        >
          <ChevronRight className="size-4" aria-hidden />
          {he.admin.statsEntry.prevPlayer}
        </Button>
        <p className="text-center text-sm font-semibold">
          {player.name} ({safeIndex + 1}/{playedPlayers.length})
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={safeIndex >= playedPlayers.length - 1}
          onClick={() => setIndex(safeIndex + 1)}
        >
          {he.admin.statsEntry.nextPlayer}
          <ChevronLeft className="size-4" aria-hidden />
        </Button>
      </div>

      <div className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-sm">
        <p className="mb-3 text-xs text-muted">{he.stats.pointsLong}</p>
        <div className="mb-4 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="lg" disabled={disabled} onClick={() => addPoints(1)}>
            {he.admin.statsEntry.add1}
          </Button>
          <Button type="button" variant="secondary" size="lg" disabled={disabled} onClick={() => addPoints(2)}>
            {he.admin.statsEntry.add2}
          </Button>
          <Button type="button" variant="secondary" size="lg" disabled={disabled} onClick={() => addPoints(3)}>
            {he.admin.statsEntry.add3}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
            label={he.stats.turnoversLong}
            value={line.turnovers}
            disabled={disabled}
            onDec={() => bump("turnovers", -1)}
            onInc={() => bump("turnovers", 1)}
          />
          <StatStepper
            label={he.stats.stealsLong}
            value={line.steals}
            disabled={disabled}
            onDec={() => bump("steals", -1)}
            onInc={() => bump("steals", 1)}
          />
        </div>
      </div>
    </section>
  );
}
