"use server";

import { blockDemoMutation } from "@/lib/auth/demo-guard";
import { requireAdmin } from "@/lib/auth/require-admin";
import { he } from "@/config/strings";
import { createSessionClient } from "@/lib/supabase/server";
import { actionFromZod, actionSuccess, type ActionResult } from "@/lib/utils/action-result";
import { mapAuthError } from "@/lib/utils/errors";
import { parseChangePasswordForm } from "@/lib/validation/account";

export async function changePasswordAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const demoBlock = blockDemoMutation();
  if (demoBlock) return demoBlock;

  const parsed = parseChangePasswordForm(formData);
  if (!parsed.success) return actionFromZod(parsed.error);

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
  if (error) return mapAuthError(error.message);

  return actionSuccess(he.admin.accountPage.changed);
}
