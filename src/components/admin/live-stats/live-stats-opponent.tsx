"use client";

import { he } from "@/config/strings";
import { Button } from "@/components/ui/button";
import type { LiveStatsClientState } from "@/lib/live-stats/form-data";

/** Opponent baskets get their own tinted block below our player controls, so the two are visually separate. */
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
    <section aria-label={he.admin.liveStats.opponentScore} className="mt-5 flex items-center gap-2 rounded-(--radius-card) border border-loss/30 bg-loss/5 p-2.5">
      <h2 className="w-14 shrink-0 truncate text-xs font-bold text-loss">{he.live.scoringOpponent}</h2>
      <div className="grid flex-1 grid-cols-4 gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={disabled || state.opponentScore <= 0}
          onClick={() => addOpponent(-1)}
          className="num"
          aria-label={`${he.admin.liveStats.opponentScore} ${he.admin.liveStats.subtract1}`}
        >
          {he.admin.liveStats.subtract1}
        </Button>
        {([1, 2, 3] as const).map((n) => (
          <Button
            key={n}
            type="button"
            variant="secondary"
            disabled={disabled}
            onClick={() => addOpponent(n)}
            aria-label={`${he.admin.liveStats.opponentScore} ${he.admin.statsEntry[`add${n}`]}`}
          >
            {he.admin.statsEntry[`add${n}`]}
          </Button>
        ))}
      </div>
    </section>
  );
}
