"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { he } from "@/config/strings";
import type { ActionResult } from "@/lib/utils/action-result";
import { loginAction } from "./actions";

export function LoginForm({ nextPath, demo }: { nextPath: string; demo: boolean }) {
  const [state, formAction, pending] = useActionState(loginAction, null as ActionResult | null);

  if (demo) {
    return <p className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-muted">{he.auth.demoNotice}</p>;
  }

  return (
    <form action={formAction} noValidate className="space-y-4">
      <input type="hidden" name="next" value={nextPath} />
      {state && !state.ok ? (
        <p role="alert" className="rounded-xl border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">
          {state.message}
        </p>
      ) : null}
      <Field label={he.auth.email} htmlFor="email" error={state && !state.ok ? state.fieldErrors?.email : undefined}>
        <Input id="email" name="email" type="email" autoComplete="email" required disabled={pending} />
      </Field>
      <Field label={he.auth.password} htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required disabled={pending} />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? he.auth.loggingIn : he.actions.login}
      </Button>
    </form>
  );
}
