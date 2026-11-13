"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea, Select } from "@/components/ui/form-controls";
import { he } from "@/config/strings";
import { CLICHE_WEIGHT_BUCKETS, type CupCliche } from "@/lib/fun/cliches";
import type { ActionResult } from "@/lib/utils/action-result";
import { approveClicheAction, rejectClicheAction } from "./actions";

const t = he.admin.clicheModeration;
const fun = he.fun.cliche;

function fieldError(state: ActionResult | null, key: string) {
  if (!state || state.ok) return undefined;
  return state.fieldErrors?.[key]?.[0];
}

function ModerationRow({ item, demo }: { item: CupCliche; demo: boolean }) {
  const [approveState, approveAction, approving] = useActionState(approveClicheAction, null as ActionResult | null);
  const [rejectState, rejectAction, rejecting] = useActionState(rejectClicheAction, null as ActionResult | null);
  const pending = approving || rejecting;
  const message =
    approveState?.ok
      ? approveState.message
      : rejectState?.ok
        ? rejectState.message
        : !approveState?.ok && approveState?.message
          ? approveState.message
          : !rejectState?.ok && rejectState?.message
            ? rejectState.message
            : null;

  return (
    <li className="card space-y-4 p-4">
      <form action={approveAction} className="space-y-3">
        <input type="hidden" name="id" value={item.id} />
        <Field label={fun.suggestBody} htmlFor={`body-${item.id}`} error={fieldError(approveState, "body")}>
          <Textarea id={`body-${item.id}`} name="body" defaultValue={item.body} rows={3} maxLength={120} required disabled={demo || pending} />
        </Field>
        <Field label={t.saidBy} htmlFor={`saidBy-${item.id}`} error={fieldError(approveState, "saidBy")}>
          <Input id={`saidBy-${item.id}`} name="saidBy" defaultValue={item.saidBy} maxLength={120} required disabled={demo || pending} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t.saidOn} htmlFor={`saidOn-${item.id}`} error={fieldError(approveState, "saidOn")}>
            <Input
              id={`saidOn-${item.id}`}
              name="saidOn"
              defaultValue={item.saidOn ?? ""}
              maxLength={40}
              placeholder={fun.suggestSaidOnHint}
              disabled={demo || pending}
            />
          </Field>
          <Field label={t.source} htmlFor={`source-${item.id}`} error={fieldError(approveState, "sourceUrl")}>
            <Input
              id={`source-${item.id}`}
              name="sourceUrl"
              defaultValue={item.sourceUrl ?? ""}
              maxLength={500}
              inputMode="url"
              dir="ltr"
              className="text-start"
              disabled={demo || pending}
            />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t.weight} htmlFor={`weight-${item.id}`}>
            <Select id={`weight-${item.id}`} name="weight" defaultValue={String(item.weight)} disabled={demo || pending}>
              {CLICHE_WEIGHT_BUCKETS.map((bucket) => (
                <option key={bucket.weight} value={bucket.weight}>
                  {bucket.weight === 60 ? fun.weightLow : bucket.weight === 80 ? fun.weightMid : fun.weightHigh} ({bucket.weight})
                </option>
              ))}
            </Select>
          </Field>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <Checkbox name="verified" defaultChecked={item.verified} disabled={demo || pending} />
            {t.verified}
          </label>
        </div>
        {message ? <p className="text-sm text-muted">{message}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={demo || pending}>
            {t.approve}
          </Button>
        </div>
      </form>
      <form action={rejectAction}>
        <input type="hidden" name="id" value={item.id} />
        <Button type="submit" size="sm" variant="danger" disabled={demo || pending}>
          {t.reject}
        </Button>
      </form>
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
