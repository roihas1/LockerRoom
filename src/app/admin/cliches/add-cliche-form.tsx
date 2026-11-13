"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea, Select } from "@/components/ui/form-controls";
import { he } from "@/config/strings";
import { CLICHE_WEIGHT_BUCKETS } from "@/lib/fun/cliches";
import type { ActionResult } from "@/lib/utils/action-result";
import { addClicheAction } from "./actions";

const t = he.admin.clicheModeration;
const fun = he.fun.cliche;

function fieldError(state: ActionResult | null, key: string) {
  if (!state || state.ok) return undefined;
  return state.fieldErrors?.[key]?.[0];
}

export function AddClicheForm({ demo }: { demo: boolean }) {
  const [state, action, pending] = useActionState(addClicheAction, null as ActionResult | null);

  return (
    <section className="card space-y-4 p-5">
      <div>
        <h2 className="font-display text-lg font-bold">{t.addTitle}</h2>
        <p className="mt-1 text-sm text-muted">{t.addHint}</p>
      </div>
      {state?.ok ? (
        <p role="status" className="rounded-xl border border-win/40 bg-win/10 px-3 py-2 text-sm text-win">
          {state.message}
        </p>
      ) : null}
      {state && !state.ok ? (
        <p role="alert" className="rounded-xl border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">
          {state.message}
        </p>
      ) : null}
      <form action={action} className="space-y-3" key={state?.ok ? state.message : "form"}>
        <Field label={fun.suggestBody} htmlFor="add-body" error={fieldError(state, "body")}>
          <Textarea id="add-body" name="body" rows={3} maxLength={120} required disabled={demo || pending} />
        </Field>
        <Field label={t.saidBy} htmlFor="add-saidBy" error={fieldError(state, "saidBy")}>
          <Input id="add-saidBy" name="saidBy" maxLength={120} required disabled={demo || pending} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t.saidOn} htmlFor="add-saidOn" error={fieldError(state, "saidOn")}>
            <Input
              id="add-saidOn"
              name="saidOn"
              maxLength={40}
              placeholder={fun.suggestSaidOnHint}
              disabled={demo || pending}
            />
          </Field>
          <Field label={t.source} htmlFor="add-source" error={fieldError(state, "sourceUrl")}>
            <Input
              id="add-source"
              name="sourceUrl"
              maxLength={500}
              inputMode="url"
              dir="ltr"
              className="text-start"
              disabled={demo || pending}
            />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t.weight} htmlFor="add-weight">
            <Select id="add-weight" name="weight" defaultValue="80" disabled={demo || pending}>
              {CLICHE_WEIGHT_BUCKETS.map((bucket) => (
                <option key={bucket.weight} value={bucket.weight}>
                  {bucket.weight === 60 ? fun.weightLow : bucket.weight === 80 ? fun.weightMid : fun.weightHigh} ({bucket.weight})
                </option>
              ))}
            </Select>
          </Field>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <Checkbox name="verified" disabled={demo || pending} />
            {t.verified}
          </label>
        </div>
        <Button type="submit" disabled={demo || pending}>
          {t.addSubmit}
        </Button>
      </form>
    </section>
  );
}
