"use client";

import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { he } from "@/config/strings";
import { Button } from "@/components/ui/button";
import type { Player } from "@/types/domain";
import type { StatRowState } from "./types";

function Stepper({
  label,
  value,
  onDec,
  onInc,
}: {
  label: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" size="icon" aria-label={`${he.admin.statsEntry.decrement} ${label}`} onClick={onDec}>
          <Minus aria-hidden />
        </Button>
        <span className="num min-w-10 text-center text-xl font-bold">{value}</span>
        <Button type="button" variant="secondary" size="icon" aria-label={`${he.admin.statsEntry.increment} ${label}`} onClick={onInc}>
          <Plus aria-hidden />
        </Button>
      </div>
    </div>
  );
}

export function StatsMobileCards({
  players,
  rows,
  index,
  onIndexChange,
  onChange,
}: {
  players: Player[];
  rows: StatRowState[];
  index: number;
  onIndexChange: (i: number) => void;
  onChange: (playerId: number, patch: Partial<StatRowState>) => void;
}) {
  const played = players.filter((p) => rows.find((r) => r.playerId === p.id)?.played);
  if (played.length === 0) {
    return <p className="text-sm text-muted md:hidden">{he.admin.statsEntry.whoPlayedHint}</p>;
  }

  const safeIndex = Math.min(index, played.length - 1);
  const player = played[safeIndex]!;
  const row = rows.find((r) => r.playerId === player.id)!;

  const bump = (key: "rebounds" | "assists" | "steals" | "blocks" | "turnovers", delta: number) => {
    const current = row[key] ?? 0;
    onChange(player.id, { [key]: Math.max(0, current + delta) });
  };

  const addPoints = (n: number) => onChange(player.id, { points: row.points + n });

  return (
    <div className="space-y-4 md:hidden">
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={safeIndex <= 0}
          onClick={() => onIndexChange(safeIndex - 1)}
        >
          <ChevronRight className="size-4" aria-hidden />
          {he.admin.statsEntry.prevPlayer}
        </Button>
        <p className="text-center text-sm font-semibold">
          {player.name} ({safeIndex + 1}/{played.length})
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={safeIndex >= played.length - 1}
          onClick={() => onIndexChange(safeIndex + 1)}
        >
          {he.admin.statsEntry.nextPlayer}
          <ChevronLeft className="size-4" aria-hidden />
        </Button>
      </div>

      <div className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-sm">
        <p className="mb-3 text-xs text-muted">{he.stats.pointsLong}</p>
        <div className="mb-4 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => addPoints(1)}>
            {he.admin.statsEntry.add1}
          </Button>
          <Button type="button" variant="secondary" onClick={() => addPoints(2)}>
            {he.admin.statsEntry.add2}
          </Button>
          <Button type="button" variant="secondary" onClick={() => addPoints(3)}>
            {he.admin.statsEntry.add3}
          </Button>
          <span className="num ms-auto self-center text-2xl font-bold">{row.points}</span>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stepper label={he.stats.reboundsLong} value={row.rebounds} onDec={() => bump("rebounds", -1)} onInc={() => bump("rebounds", 1)} />
          <Stepper label={he.stats.assistsLong} value={row.assists} onDec={() => bump("assists", -1)} onInc={() => bump("assists", 1)} />
          <Stepper label={he.stats.stealsLong} value={row.steals ?? 0} onDec={() => bump("steals", -1)} onInc={() => bump("steals", 1)} />
          <Stepper label={he.stats.blocksLong} value={row.blocks ?? 0} onDec={() => bump("blocks", -1)} onInc={() => bump("blocks", 1)} />
          <Stepper label={he.stats.turnoversLong} value={row.turnovers ?? 0} onDec={() => bump("turnovers", -1)} onInc={() => bump("turnovers", 1)} />
        </div>
      </div>

      {safeIndex < played.length - 1 ? (
        <Button type="button" className="w-full" variant="outline" onClick={() => onIndexChange(safeIndex + 1)}>
          {he.admin.statsEntry.nextPlayer}
        </Button>
      ) : null}
    </div>
  );
}
