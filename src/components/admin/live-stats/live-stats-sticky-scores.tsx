"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { LiveStatsEditableNumber } from "@/components/admin/live-stats/live-stats-editable-number";
import { gameStatusLabels } from "@/config/labels";
import { he } from "@/config/strings";
import { cn } from "@/lib/utils/cn";
import type { GameStatus } from "@/types/domain";

/**
 * Compact scoreboard that stays on top while scoring. Tapping a score lets the manager fix it directly; the team
 * score is edited without touching player points. The back link lives here because the live screen covers the
 * admin header to leave the whole phone for the controls.
 */
export function LiveStatsStickyScores({
  teamScore,
  opponentScore,
  teamName,
  opponentName,
  status,
  backHref,
  backLabel,
  disabled,
  onTeamScore,
  onOpponentScore,
}: {
  teamScore: number;
  opponentScore: number;
  teamName: string;
  opponentName: string;
  status: GameStatus;
  backHref: string;
  backLabel: string;
  disabled: boolean;
  onTeamScore: (next: number) => void;
  onOpponentScore: (next: number) => void;
}) {
  const diff = teamScore - opponentScore;
  const margin = diff === 0 ? he.admin.liveStats.tied : diff > 0 ? he.admin.liveStats.leadBy(diff) : he.admin.liveStats.trailBy(-diff);
  const isLive = status === "live";

  return (
    <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-surface/95 px-4 pt-[calc(0.75rem+var(--safe-top))] pb-1.5 backdrop-blur-sm sm:-mx-0 sm:rounded-b-2xl sm:border-x">
      <div className="flex h-9 items-center gap-2">
        <Link
          href={backHref}
          aria-label={backLabel}
          data-user-content
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted transition hover:border-team/40 hover:text-text active:scale-95"
        >
          <ChevronRight className="size-4" aria-hidden />
        </Link>
        {isLive ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-loss/15 px-2.5 py-0.5 text-xs font-bold text-loss" role="status">
            <span className="relative flex size-2" aria-hidden>
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-loss opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-loss" />
            </span>
            {gameStatusLabels.live}
          </span>
        ) : (
          <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-bold text-muted">{gameStatusLabels[status]}</span>
        )}
        <span className={cn("ms-auto text-xs font-bold", diff > 0 ? "text-win" : diff < 0 ? "text-loss" : "text-muted")}>{margin}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex min-w-0 flex-col items-center">
          <p className="w-full truncate text-center text-[11px] leading-tight font-medium text-muted" data-user-content>
            {teamName}
          </p>
          <LiveStatsEditableNumber
            value={teamScore}
            label={`${he.admin.liveStats.editScore} · ${teamName}`}
            disabled={disabled}
            onCommit={onTeamScore}
            className="font-display text-4xl leading-none font-bold"
          />
        </div>
        <span className="pt-3 text-xl font-bold text-muted" aria-hidden>
          :
        </span>
        <div className="flex min-w-0 flex-col items-center">
          <p className="w-full truncate text-center text-[11px] leading-tight font-medium text-muted" data-user-content>
            {opponentName}
          </p>
          <LiveStatsEditableNumber
            value={opponentScore}
            label={`${he.admin.liveStats.editScore} · ${opponentName}`}
            disabled={disabled}
            onCommit={onOpponentScore}
            className="font-display text-4xl leading-none font-bold"
          />
        </div>
      </div>
    </div>
  );
}
