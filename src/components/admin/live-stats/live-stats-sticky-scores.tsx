"use client";

import { he } from "@/config/strings";
import { LiveStatsEditableNumber } from "@/components/admin/live-stats/live-stats-editable-number";

/** Tapping a score lets the manager fix it directly; the team score is edited without touching player points. */
export function LiveStatsStickyScores({
  teamScore,
  opponentScore,
  opponentName,
  disabled,
  onTeamScore,
  onOpponentScore,
}: {
  teamScore: number;
  opponentScore: number;
  opponentName: string;
  disabled: boolean;
  onTeamScore: (next: number) => void;
  onOpponentScore: (next: number) => void;
}) {
  return (
    <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-surface/95 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 backdrop-blur-sm sm:-mx-0 sm:rounded-2xl sm:border sm:px-4">
      <div className="flex items-center justify-center gap-4">
        <div className="flex flex-col items-center">
          <p className="text-xs text-muted">{he.stats.pointsLong}</p>
          <LiveStatsEditableNumber
            value={teamScore}
            label={`${he.admin.liveStats.editScore} · ${he.stats.pointsLong}`}
            disabled={disabled}
            onCommit={onTeamScore}
            className="font-display text-3xl font-bold"
          />
        </div>
        <span className="text-lg font-bold text-muted">:</span>
        <div className="flex flex-col items-center">
          <p className="text-xs text-muted" data-user-content>
            {opponentName}
          </p>
          <LiveStatsEditableNumber
            value={opponentScore}
            label={`${he.admin.liveStats.editScore} · ${opponentName}`}
            disabled={disabled}
            onCommit={onOpponentScore}
            className="font-display text-3xl font-bold"
          />
        </div>
      </div>
    </div>
  );
}
