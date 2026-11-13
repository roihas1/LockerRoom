"use server";

import { revalidatePath } from "next/cache";
import { he } from "@/config/strings";
import { blockDemoMutation } from "@/lib/auth/demo-guard";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSessionClient } from "@/lib/supabase/server";
import { actionFail, actionSuccess, type ActionResult } from "@/lib/utils/action-result";
import { mapErrorToAction } from "@/lib/utils/errors";

async function setStatus(formData: FormData, status: "approved" | "rejected"): Promise<ActionResult> {
  await requireAdmin();
  const demoBlock = blockDemoMutation();
  if (demoBlock) return demoBlock;

  const id = Number(formData.get("id"));
  if (!Number.isFinite(id) || id <= 0) return actionFail(he.errors.notFound, "not_found");

  const supabase = await createSessionClient();
  const { error } = await supabase.from("cup_cliches").update({ status }).eq("id", id).eq("status", "pending");
  if (error) return mapErrorToAction(error);

  revalidatePath("/admin/cliches");
  revalidatePath("/cup-cliches");
  return actionSuccess(status === "approved" ? he.admin.clicheModeration.approved : he.admin.clicheModeration.rejected);
}

export async function approveClicheAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return setStatus(formData, "approved");
}

export async function rejectClicheAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return setStatus(formData, "rejected");
}
