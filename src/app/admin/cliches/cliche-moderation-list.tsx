"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { he } from "@/config/strings";
import type { CupCliche } from "@/lib/fun/cliches";
import type { ActionResult } from "@/lib/utils/action-result";
import { approveClicheAction, rejectClicheAction } from "./actions";

const t = he.admin.clicheModeration;

function ModerationRow({ item, demo }: { item: CupCliche; demo: boolean }) {
  const [approveState, approveAction, approving] = useActionState(approveClicheAction, null as ActionResult | null);
  const [rejectState, rejectAction, rejecting] = useActionState(rejectClicheAction, null as ActionResult | null);
  const pending = approving || rejecting;
  const message = approveState?.ok ? approveState.message : rejectState?.ok ? rejectState.message : !approveState?.ok && approveState?.message ? approveState.message : !rejectState?.ok && rejectState?.message ? rejectState.message : null;

  return (
    <li className="card space-y-3 p-4">
      <blockquote className="space-y-1">
        <p data-user-content className="font-display text-lg font-bold leading-snug">
          ״{item.body}״
        </p>
        <p data-user-content className="text-sm text-muted">
          {t.saidBy}: {item.saidBy}
        </p>
        <p className="text-xs text-muted">
          {t.weight}: {item.weight}
        </p>
      </blockquote>
      {message ? <p className="text-sm text-muted">{message}</p> : null}
      <div className="flex flex-wrap gap-2">
        <form action={approveAction}>
          <input type="hidden" name="id" value={item.id} />
          <Button type="submit" size="sm" disabled={demo || pending}>
            {t.approve}
          </Button>
        </form>
        <form action={rejectAction}>
          <input type="hidden" name="id" value={item.id} />
          <Button type="submit" size="sm" variant="danger" disabled={demo || pending}>
            {t.reject}
          </Button>
        </form>
      </div>
    </li>
  );
}

export function ClicheModerationList({ items, demo }: { items: CupCliche[]; demo: boolean }) {
  if (!items.length) {
    return <p className="text-muted">{t.empty}</p>;
  }
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <ModerationRow key={item.id} item={item} demo={demo} />
      ))}
    </ul>
  );
}
