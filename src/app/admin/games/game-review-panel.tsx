"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteGameAction, publishGameAction } from "@/app/admin/games/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { he } from "@/config/strings";
import type { ActionResult } from "@/lib/utils/action-result";

export function GameReviewPanel({ gameId, isPublished, demo }: { gameId: number; isPublished: boolean; demo: boolean }) {
  const router = useRouter();
  const [publishState, publishAction, publishPending] = useActionState(publishGameAction, null as ActionResult | null);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteGameAction, null as ActionResult | null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (deleteState?.ok && deleteState.redirectTo) router.push(deleteState.redirectTo);
  }, [deleteState, router]);

  const disabled = demo || publishPending || deletePending;

  return (
    <div className="card flex flex-wrap gap-2 p-4">
      {(publishState && !publishState.ok) || (deleteState && !deleteState.ok) ? (
        <p role="alert" className="w-full rounded-xl border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">
          {(publishState && !publishState.ok ? publishState : deleteState)?.message}
        </p>
      ) : null}
      {publishState?.ok ? (
        <p role="status" className="w-full text-sm text-win">
          {publishState.message}
        </p>
      ) : null}

      <form action={publishAction}>
        <input type="hidden" name="gameId" value={gameId} />
        <input type="hidden" name="publish" value={isPublished ? "false" : "true"} />
        <Button type="submit" disabled={disabled}>
          {isPublished ? he.actions.unpublish : he.actions.publish}
        </Button>
      </form>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="danger" disabled={disabled}>
            {he.actions.delete}
          </Button>
        </DialogTrigger>
        <DialogContent title={he.admin.confirmDeleteTitle} description={he.admin.confirmDeleteText}>
          <form
            action={deleteAction}
            className="flex justify-end gap-2"
            onSubmit={() => setOpen(false)}
          >
            <input type="hidden" name="gameId" value={gameId} />
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {he.actions.cancel}
            </Button>
            <Button type="submit" variant="danger" disabled={disabled}>
              {he.actions.confirm}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
