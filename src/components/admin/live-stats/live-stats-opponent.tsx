"use client";

import { he } from "@/config/strings";
import { Button } from "@/components/ui/button";
import type { LiveStatsClientState } from "@/lib/live-stats/form-data";

export function LiveStatsOpponent({
  state,
  onChange,
  disabled,
}: {
  state: LiveStatsClientState;
  onChange: (next: LiveStatsClientState) => void;
  disabled: boolean;
}) {
  const addOpponent = (n: number) => {
    onChange({ ...state, opponentScore: Math.max(0, state.opponentScore + n) });
  };

  return (
    <section className="space-y-2 rounded-(--radius-card) border border-border bg-surface-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold">{he.admin.liveStats.opponentScore}</h2>
        <span className="num text-2xl font-bold">{state.opponentScore}</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={disabled || state.opponentScore <= 0}
          onClick={() => addOpponent(-1)}
          className="num"
        >
          {he.admin.liveStats.subtract1}
        </Button>
        {([1, 2, 3] as const).map((n) => (
          <Button key={n} type="button" variant="secondary" size="lg" disabled={disabled} onClick={() => addOpponent(n)}>
            {he.admin.statsEntry[`add${n}`]}
          </Button>
        ))}
      </div>
    </section>
  );
}
