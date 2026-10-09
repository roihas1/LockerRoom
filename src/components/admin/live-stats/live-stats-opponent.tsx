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
    onChange({ ...state, opponentScore: state.opponentScore + n });
  };

  return (
    <section className="space-y-2 rounded-(--radius-card) border border-border bg-surface-2 p-4">
      <h2 className="text-sm font-bold">{he.admin.liveStats.opponentScore}</h2>
      <div className="flex flex-wrap items-center gap-2">
        <span className="num min-w-12 text-center text-2xl font-bold">{state.opponentScore}</span>
        <Button type="button" variant="secondary" size="lg" disabled={disabled} onClick={() => addOpponent(1)}>
          {he.admin.statsEntry.add1}
        </Button>
        <Button type="button" variant="secondary" size="lg" disabled={disabled} onClick={() => addOpponent(2)}>
          {he.admin.statsEntry.add2}
        </Button>
        <Button type="button" variant="secondary" size="lg" disabled={disabled} onClick={() => addOpponent(3)}>
          {he.admin.statsEntry.add3}
        </Button>
      </div>
    </section>
  );
}
