"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { runIbbaSyncNowAction } from "@/app/admin/games/ibba-sync-actions";
import { Button } from "@/components/ui/button";
import { he } from "@/config/strings";
import { formatShortDate, formatTime } from "@/lib/utils/dates";
import type { IbbaSyncRun } from "@/lib/admin/ibba-sync";

export function IbbaSyncPanel({ lastRun }: { lastRun: IbbaSyncRun | null }) {
  const [pending, startTransition] = useTransition();

  return (
    <section className="card space-y-2 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display font-bold">{he.admin.ibbaSync.title}</h2>
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await runIbbaSyncNowAction();
              if (result.ok) toast.success(result.message);
              else toast.error(result.message);
            })
          }
        >
          {he.admin.ibbaSync.runNow}
        </Button>
      </div>
      <p className="text-muted">{he.admin.ibbaSync.hint}</p>
      {lastRun ? (
        <p className="text-xs text-muted">
          {he.admin.ibbaSync.lastRun}: {formatShortDate(lastRun.ranAt)} {formatTime(lastRun.ranAt)}
          {lastRun.error ? ` · ${he.admin.ibbaSync.error}: ${lastRun.error}` : null}
          {!lastRun.error && lastRun.changes.length
            ? ` · ${he.admin.ibbaSync.changes(lastRun.changes.length)}`
            : null}
        </p>
      ) : (
        <p className="text-xs text-muted">{he.admin.ibbaSync.never}</p>
      )}
    </section>
  );
}
