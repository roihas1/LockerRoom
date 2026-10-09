"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { he } from "@/config/strings";
import type { ActionResult } from "@/lib/utils/action-result";
import { addAdminAction, revokeAdminAction } from "./actions";

function fieldError(state: ActionResult | null, key: string) {
  if (!state || state.ok) return undefined;
  return state.fieldErrors?.[key];
}

export function AdminsPanel({
  admins,
  currentEmail,
  demo,
}: {
  admins: { email: string }[];
  currentEmail: string | null;
  demo: boolean;
}) {
  const [addState, addAction, addPending] = useActionState(addAdminAction, null as ActionResult | null);
  const [revokeState, revokeAction, revokePending] = useActionState(revokeAdminAction, null as ActionResult | null);

  const alert = [addState, revokeState].find((s) => s && !s.ok);
  const success = [addState, revokeState].find((s) => s?.ok);

  return (
    <div className="space-y-8">
      {alert ? (
        <p role="alert" className="rounded-xl border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">
          {alert.message}
        </p>
      ) : null}
      {success ? (
        <p role="status" className="rounded-xl border border-win/40 bg-win/10 px-3 py-2 text-sm text-win">
          {success.message}
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{he.admin.adminsPage.list}</h2>
        <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
          {admins.map((admin) => {
            const isSelf = currentEmail && admin.email.toLowerCase() === currentEmail.toLowerCase();
            return (
              <li key={admin.email} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span className="text-sm">
                  {admin.email}
                  {isSelf ? <span className="text-muted"> {he.admin.adminsPage.you}</span> : null}
                </span>
                <form action={revokeAction}>
                  <input type="hidden" name="email" value={admin.email} />
                  <Button type="submit" size="sm" variant="outline" disabled={demo || revokePending}>
                    {he.admin.adminsPage.revoke}
                  </Button>
                </form>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{he.admin.adminsPage.add}</h2>
        <form action={addAction} noValidate className="card max-w-md space-y-4 p-5">
          <Field label={he.admin.adminsPage.email} htmlFor="email" error={fieldError(addState, "email")}>
            <Input id="email" name="email" type="email" autoComplete="off" disabled={demo || addPending} required />
          </Field>
          <Field
            label={he.admin.adminsPage.tempPassword}
            htmlFor="tempPassword"
            error={fieldError(addState, "tempPassword")}
            hint={he.admin.adminsPage.tempPasswordHint}
          >
            <Input id="tempPassword" name="tempPassword" type="password" autoComplete="new-password" disabled={demo || addPending} required />
          </Field>
          <Button type="submit" disabled={demo || addPending}>
            {he.actions.add}
          </Button>
        </form>
      </section>
    </div>
  );
}
