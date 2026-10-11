"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { blockDemoMutation } from "@/lib/auth/demo-guard";
import { triggerIbbaSync } from "@/lib/admin/ibba-sync";
import { he } from "@/config/strings";
import { actionFail, actionSuccess, type ActionResult } from "@/lib/utils/action-result";

export async function runIbbaSyncNowAction(): Promise<ActionResult> {
  await requireAdmin();
  const demo = blockDemoMutation();
  if (demo) return demo;
  const ok = await triggerIbbaSync("schedule");
  if (!ok) return actionFail(he.admin.ibbaSync.failed, "failed");
  revalidatePath("/admin/games");
  return actionSuccess(he.admin.ibbaSync.started);
}
