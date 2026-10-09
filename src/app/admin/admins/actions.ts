"use server";

import { revalidatePath } from "next/cache";
import { blockDemoMutation } from "@/lib/auth/demo-guard";
import { requireAdmin } from "@/lib/auth/require-admin";
import { he } from "@/config/strings";
import { createServiceClient } from "@/lib/supabase/admin";
import { createSessionClient } from "@/lib/supabase/server";
import { actionFail, actionFromZod, actionSuccess, type ActionResult } from "@/lib/utils/action-result";
import { mapErrorToAction } from "@/lib/utils/errors";
import { parseAddAdminForm } from "@/lib/validation/account";

export async function addAdminAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const demoBlock = blockDemoMutation();
  if (demoBlock) return demoBlock;

  const parsed = parseAddAdminForm(formData);
  if (!parsed.success) return actionFromZod(parsed.error);

  const service = createServiceClient();
  if (!service) return actionFail(he.errors.missingServiceKey, "config");

  const { error: createError } = await service.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.tempPassword,
    email_confirm: true,
  });
  if (createError) {
    const msg = createError.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered")) {
      return actionFail(he.errors.duplicate, "duplicate", { email: [he.errors.duplicate] });
    }
    return mapErrorToAction(createError);
  }

  const supabase = await createSessionClient();
  const { error: roleError } = await supabase.rpc("admin_set_role", {
    target_email: parsed.data.email,
    new_role: "admin",
  });
  if (roleError) return mapErrorToAction(roleError);

  revalidatePath("/admin/admins");
  return actionSuccess(he.admin.adminsPage.added);
}

export async function revokeAdminAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const demoBlock = blockDemoMutation();
  if (demoBlock) return demoBlock;

  const email = String(formData.get("email") ?? "").trim();
  if (!email) return actionFail(he.validation.required, "validation");

  const supabase = await createSessionClient();
  const { error } = await supabase.rpc("admin_set_role", { target_email: email, new_role: "user" });
  if (error) return mapErrorToAction(error);

  revalidatePath("/admin/admins");
  return actionSuccess(he.admin.adminsPage.revoked);
}
