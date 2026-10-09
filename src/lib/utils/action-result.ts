import type { ZodError } from "zod";
import { he } from "@/config/strings";

/** Shared server-action response shape; all user-facing messages are Hebrew. */
export type ActionResult =
  | { ok: true; message: string; redirectTo?: string }
  | { ok: false; code: string; message: string; fieldErrors?: Record<string, string[]> };

export function actionSuccess(message: string, redirectTo?: string): ActionResult {
  return redirectTo ? { ok: true, message, redirectTo } : { ok: true, message };
}

export function actionFail(message: string, code: string, fieldErrors?: Record<string, string[]>): ActionResult {
  return { ok: false, code, message, fieldErrors };
}

export function actionFromZod(error: ZodError): ActionResult {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }
  return actionFail(he.errors.validation, "validation", fieldErrors);
}
