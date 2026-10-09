"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { he } from "@/config/strings";
import type { ActionResult } from "@/lib/utils/action-result";
import { changePasswordAction } from "./actions";

function fieldError(state: ActionResult | null, key: string) {
  if (!state || state.ok) return undefined;
  return state.fieldErrors?.[key];
}

export function AccountForm({ demo }: { demo: boolean }) {
  const [state, action, pending] = useActionState(changePasswordAction, null as ActionResult | null);

  return (
    <div className="max-w-md space-y-4">
      {state && !state.ok ? (
        <p role="alert" className="rounded-xl border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">
          {state.message}
        </p>
      ) : null}
      {state?.ok ? (
        <p role="status" className="rounded-xl border border-win/40 bg-win/10 px-3 py-2 text-sm text-win">
          {state.message}
        </p>
      ) : null}
      <form action={action} noValidate className="card space-y-4 p-5">
        <Field label={he.admin.accountPage.newPassword} htmlFor="newPassword" error={fieldError(state, "newPassword")}>
          <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" disabled={demo || pending} required />
        </Field>
        <Field label={he.admin.accountPage.confirmPassword} htmlFor="confirmPassword" error={fieldError(state, "confirmPassword")}>
          <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" disabled={demo || pending} required />
        </Field>
        <Button type="submit" disabled={demo || pending}>
          {he.admin.accountPage.changePassword}
        </Button>
      </form>
    </div>
  );
}
