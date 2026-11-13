"use server";

import { revalidatePath } from "next/cache";
import { he } from "@/config/strings";
import { blockDemoMutation } from "@/lib/auth/demo-guard";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSessionClient } from "@/lib/supabase/server";
import { actionFail, actionFromZod, actionSuccess, type ActionResult } from "@/lib/utils/action-result";
import { mapErrorToAction } from "@/lib/utils/errors";
import { adminClicheSchema } from "@/lib/validation/cliche";

function revalidateClichePaths() {
  revalidatePath("/admin/cliches");
  revalidatePath("/cup-cliches");
  revalidatePath("/");
}

function parseAdminClicheForm(formData: FormData) {
  return adminClicheSchema.safeParse({
    body: String(formData.get("body") ?? ""),
    saidBy: String(formData.get("saidBy") ?? ""),
    weight: formData.get("weight"),
    saidOn: formData.get("saidOn"),
    sourceUrl: formData.get("sourceUrl"),
    verified: formData.get("verified") === "on" || formData.get("verified") === "true",
  });
}

export async function approveClicheAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const demoBlock = blockDemoMutation();
  if (demoBlock) return demoBlock;

  const id = Number(formData.get("id"));
  if (!Number.isFinite(id) || id <= 0) return actionFail(he.errors.notFound, "not_found");

  const parsed = parseAdminClicheForm(formData);
  if (!parsed.success) return actionFromZod(parsed.error);

  const supabase = await createSessionClient();
  const { error } = await supabase
    .from("cup_cliches")
    .update({
      status: "approved",
      body: parsed.data.body,
      said_by: parsed.data.saidBy,
      weight: parsed.data.weight,
      said_on: parsed.data.saidOn,
      source_url: parsed.data.sourceUrl,
      verified: parsed.data.verified,
    })
    .eq("id", id)
    .eq("status", "pending");
  if (error) return mapErrorToAction(error);

  revalidateClichePaths();
  return actionSuccess(he.admin.clicheModeration.approved);
}

export async function rejectClicheAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const demoBlock = blockDemoMutation();
  if (demoBlock) return demoBlock;

  const id = Number(formData.get("id"));
  if (!Number.isFinite(id) || id <= 0) return actionFail(he.errors.notFound, "not_found");

  const supabase = await createSessionClient();
  const { error } = await supabase.from("cup_cliches").update({ status: "rejected" }).eq("id", id).eq("status", "pending");
  if (error) return mapErrorToAction(error);

  revalidateClichePaths();
  return actionSuccess(he.admin.clicheModeration.rejected);
}

export async function addClicheAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const demoBlock = blockDemoMutation();
  if (demoBlock) return demoBlock;

  const parsed = parseAdminClicheForm(formData);
  if (!parsed.success) return actionFromZod(parsed.error);

  const supabase = await createSessionClient();
  const { error } = await supabase.from("cup_cliches").insert({
    body: parsed.data.body,
    said_by: parsed.data.saidBy,
    weight: parsed.data.weight,
    said_on: parsed.data.saidOn,
    source_url: parsed.data.sourceUrl,
    verified: parsed.data.verified,
    status: "approved",
  });
  if (error) return mapErrorToAction(error);

  revalidateClichePaths();
  return actionSuccess(he.admin.clicheModeration.added);
}
