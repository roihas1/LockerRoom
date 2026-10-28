"use client";

import { Button } from "@/components/ui/button";
import { he } from "@/config/strings";
import type { LiveSaveStatus } from "@/lib/live-stats/types";
import { cn } from "@/lib/utils/cn";

const tone: Record<LiveSaveStatus, string> = {
  idle: "bg-muted",
  saving: "bg-warning animate-pulse",
  saved: "bg-win",
  error: "bg-loss",
  offline: "bg-loss",
};

/** Always-visible save state for the scorer: a colour dot plus text, and a manual retry when a save failed. */
export function LiveStatsSaveIndicator({
  status,
  label,
  onRetry,
}: {
  status: LiveSaveStatus;
  label: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm" aria-live="polite" data-save-status={status}>
      <span className={cn("size-2.5 shrink-0 rounded-full", tone[status])} aria-hidden />
      <span className="truncate text-muted">{label ?? "\u00a0"}</span>
      {status === "error" ? (
        <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
          {he.admin.liveStats.retryNow}
        </Button>
      ) : null}
    </div>
  );
}
