"use server";

import { revalidatePath } from "next/cache";
import { blockDemoMutation } from "@/lib/auth/demo-guard";
import { requireAdmin } from "@/lib/auth/require-admin";
import { he } from "@/config/strings";
import { createSessionClient } from "@/lib/supabase/server";
import { actionFail, actionFromZod, actionSuccess, type ActionResult } from "@/lib/utils/action-result";
import { mapErrorToAction } from "@/lib/utils/errors";
import { parsePlayerForm } from "@/lib/validation/player";

export async function savePlayerAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const demoBlock = blockDemoMutation();
  if (demoBlock) return demoBlock;

  const playerIdRaw = formData.get("playerId");
  const playerId = playerIdRaw ? Number(playerIdRaw) : null;
  const parsed = parsePlayerForm(formData);
  if (!parsed.success) return actionFromZod(parsed.error);

  const supabase = await createSessionClient();
  const row = {
    name: parsed.data.name,
    jersey_number: parsed.data.jerseyNumber,
    position: parsed.data.position,
    height_cm: parsed.data.heightCm,
    nickname: parsed.data.nickname ?? null,
    team_role: parsed.data.teamRole ?? null,
    description: parsed.data.description ?? null,
    strength: parsed.data.strength ?? null,
    weakness: parsed.data.weakness ?? null,
    quote: parsed.data.quote ?? null,
    intro: parsed.data.intro ?? null,
    hashtag: parsed.data.hashtag ?? null,
    sort_order: parsed.data.sortOrder,
    is_active: parsed.data.isActive ?? true,
    ...(parsed.data.photoMediaId !== undefined ? { photo_media_id: parsed.data.photoMediaId } : {}),
  };

  const result = playerId
    ? await supabase.from("players").update(row).eq("id", playerId).select("id").single()
    : await supabase.from("players").insert(row).select("id").single();

  if (result.error) return mapErrorToAction(result.error);

  const id = result.data.id;
  revalidatePath("/admin/players");
  revalidatePath(`/admin/players/${id}`);
  revalidatePath("/players");
  return actionSuccess(he.admin.saved, `/admin/players/${id}`);
}

export async function setPlayerActiveAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const demoBlock = blockDemoMutation();
  if (demoBlock) return demoBlock;

  const playerId = Number(formData.get("playerId"));
  const active = formData.get("active") === "true";
  if (!playerId) return actionFail(he.errors.notFound, "not_found");

  const supabase = await createSessionClient();
  const { error } = await supabase.from("players").update({ is_active: active }).eq("id", playerId);
  if (error) return mapErrorToAction(error);

  revalidatePath("/admin/players");
  revalidatePath(`/admin/players/${playerId}`);
  revalidatePath("/players");
  return actionSuccess(he.admin.saved);
}
