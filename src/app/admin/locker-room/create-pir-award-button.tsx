"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSeasonPirAwardAction } from "@/app/admin/locker-room/actions";
import { Button } from "@/components/ui/button";
import { he } from "@/config/strings";
import type { ActionResult } from "@/lib/utils/action-result";

export function CreatePirAwardButton({ seasonId, demo }: { seasonId: number; demo: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createSeasonPirAwardAction, null as ActionResult | null);

  useEffect(() => {
    if (state?.ok && state.redirectTo) router.push(state.redirectTo);
  }, [state, router]);

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={action}>
        <input type="hidden" name="seasonId" value={seasonId} />
        <Button type="submit" variant="outline" disabled={demo || pending}>
          {he.fun.pirAward.createDraft}
        </Button>
      </form>
      {state && !state.ok ? (
        <p role="alert" className="text-xs text-loss">
          {state.message}
        </p>
      ) : null}
      {state?.ok ? (
        <p role="status" className="text-xs text-win">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
