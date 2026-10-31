"use client";

import { he } from "@/config/strings";
import { useLastTap } from "@/components/admin/live-stats/use-last-tap";
import { Button } from "@/components/ui/button";
import { appendEvents, type LiveStatsClientState } from "@/lib/live-stats/form-data";
import { eventsForOpponentTap } from "@/lib/live-stats/event-log";
import { cn } from "@/lib/utils/cn";

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
  const { label, flashNonce, announce, isFlashing } = useLastTap();

  const addOpponent = (n: number) => {
    const nextScore = Math.max(0, state.opponentScore + n);
    const delta = nextScore - state.opponentScore;
    if (delta === 0) return;
    announce("opponent_points", delta, `opp:${delta}`);
    onChange(appendEvents({ ...state, opponentScore: nextScore }, eventsForOpponentTap(delta)));
  };

  return (
    <section aria-label={he.admin.liveStats.opponentScore} className="mt-5 space-y-1.5">
      <div className="flex items-center gap-2 rounded-(--radius-card) border border-loss/30 bg-loss/5 p-2.5">
        <div className="w-14 shrink-0">
          <h2 className="truncate text-xs font-bold text-loss">{he.live.scoringOpponent}</h2>
          <p
            key={label ? `${label}-${flashNonce}` : "idle"}
            role="status"
            aria-live="polite"
            className={cn("min-h-4 truncate text-[11px] font-bold", label ? "text-loss motion-safe:animate-fade-up" : "text-transparent")}
          >
            {label ?? "·"}
          </p>
        </div>
        <div className="grid flex-1 grid-cols-4 gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={disabled || state.opponentScore <= 0}
            onClick={() => addOpponent(-1)}
            key={isFlashing("opp:-1") ? `opp-m1-${flashNonce}` : "opp-m1"}
            className={cn("num", isFlashing("opp:-1") && "motion-safe:animate-tap-pop bg-loss/25 ring-2 ring-loss/50")}
            aria-label={`${he.admin.liveStats.opponentScore} ${he.admin.liveStats.subtract1}`}
          >
            {he.admin.liveStats.subtract1}
          </Button>
          {([1, 2, 3] as const).map((n) => (
            <Button
              key={isFlashing(`opp:${n}`) ? `opp-${n}-${flashNonce}` : `opp-${n}`}
              type="button"
              variant="secondary"
              disabled={disabled}
              onClick={() => addOpponent(n)}
              className={cn(isFlashing(`opp:${n}`) && "motion-safe:animate-tap-pop bg-loss/25 ring-2 ring-loss/50")}
              aria-label={`${he.admin.liveStats.opponentScore} ${he.admin.statsEntry[`add${n}`]}`}
            >
              {he.admin.statsEntry[`add${n}`]}
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}
