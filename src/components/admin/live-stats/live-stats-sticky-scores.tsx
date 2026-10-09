"use client";

import { he } from "@/config/strings";

export function LiveStatsStickyScores({
  teamScore,
  opponentScore,
  opponentName,
}: {
  teamScore: number;
  opponentScore: number;
  opponentName: string;
}) {
  return (
    <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur-sm sm:-mx-0 sm:rounded-2xl sm:border sm:px-4">
      <div className="flex items-center justify-center gap-4">
        <div className="text-center">
          <p className="text-xs text-muted">{he.stats.pointsLong}</p>
          <p className="num font-display text-3xl font-bold">{teamScore}</p>
        </div>
        <span className="text-lg font-bold text-muted">:</span>
        <div className="text-center">
          <p className="text-xs text-muted" data-user-content>
            {opponentName}
          </p>
          <p className="num font-display text-3xl font-bold">{opponentScore}</p>
        </div>
      </div>
    </div>
  );
}
