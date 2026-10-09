"use server";

import { revalidatePath } from "next/cache";
import { blockDemoMutation } from "@/lib/auth/demo-guard";
import { requireAdmin } from "@/lib/auth/require-admin";
import { he } from "@/config/strings";
import { createSessionClient } from "@/lib/supabase/server";
import { actionFail, actionFromZod, actionSuccess, type ActionResult } from "@/lib/utils/action-result";
import { mapErrorToAction } from "@/lib/utils/errors";
import { parseSeasonForm, parseTeamSettingsForm } from "@/lib/validation/settings";

function revalidateSettings() {
  revalidatePath("/admin/settings");
  revalidatePath("/");
}

export async function saveTeamSettingsAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const demoBlock = blockDemoMutation();
  if (demoBlock) return demoBlock;

  const parsed = parseTeamSettingsForm(formData);
  if (!parsed.success) return actionFromZod(parsed.error);

  const supabase = await createSessionClient();
  const { error } = await supabase
    .from("team")
    .update({
      name: parsed.data.name,
      short_name: parsed.data.shortName,
      description: parsed.data.description ?? null,
      primary_color: parsed.data.primaryColor,
      secondary_color: parsed.data.secondaryColor,
      ...(parsed.data.logoMediaId !== undefined ? { logo_media_id: parsed.data.logoMediaId } : {}),
      ...(parsed.data.coverMediaId !== undefined ? { cover_media_id: parsed.data.coverMediaId } : {}),
    })
    .eq("id", 1);
  if (error) return mapErrorToAction(error);

  revalidateSettings();
  return actionSuccess(he.admin.saved);
}

export async function createSeasonAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const demoBlock = blockDemoMutation();
  if (demoBlock) return demoBlock;

  const parsed = parseSeasonForm(formData);
  if (!parsed.success) return actionFromZod(parsed.error);

  const supabase = await createSessionClient();
  if (parsed.data.makeActive) {
    const { error: clearError } = await supabase.from("seasons").update({ is_active: false }).eq("is_active", true);
    if (clearError) return mapErrorToAction(clearError);
  }

  const { error } = await supabase.from("seasons").insert({
    name: parsed.data.name,
    slug: parsed.data.slug,
    start_date: parsed.data.startDate,
    end_date: parsed.data.endDate,
    is_active: parsed.data.makeActive ?? false,
  });
  if (error) return mapErrorToAction(error);

  revalidateSettings();
  revalidatePath("/games");
  return actionSuccess(he.admin.saved);
}

export async function setActiveSeasonAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const demoBlock = blockDemoMutation();
  if (demoBlock) return demoBlock;

  const seasonId = Number(formData.get("seasonId"));
  if (!seasonId) return actionFail(he.errors.notFound, "not_found");

  const supabase = await createSessionClient();
  const { error: clearError } = await supabase.from("seasons").update({ is_active: false }).eq("is_active", true);
  if (clearError) return mapErrorToAction(clearError);

  const { error } = await supabase.from("seasons").update({ is_active: true }).eq("id", seasonId);
  if (error) return mapErrorToAction(error);

  revalidateSettings();
  revalidatePath("/games");
  revalidatePath("/");
  return actionSuccess(he.admin.saved);
}
