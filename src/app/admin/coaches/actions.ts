"use server";

import { revalidatePath } from "next/cache";
import { blockDemoMutation } from "@/lib/auth/demo-guard";
import { requireAdmin } from "@/lib/auth/require-admin";
import { he } from "@/config/strings";
import { createSessionClient } from "@/lib/supabase/server";
import { actionFromZod, actionSuccess, type ActionResult } from "@/lib/utils/action-result";
import { mapErrorToAction } from "@/lib/utils/errors";
import { parseCoachForm } from "@/lib/validation/coach";

export async function saveCoachAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const demoBlock = blockDemoMutation();
  if (demoBlock) return demoBlock;

  const coachIdRaw = formData.get("coachId");
  const coachId = coachIdRaw ? Number(coachIdRaw) : null;
  const parsed = parseCoachForm(formData);
  if (!parsed.success) return actionFromZod(parsed.error);

  const supabase = await createSessionClient();
  const row = {
    name: parsed.data.name,
    role: parsed.data.role ?? null,
    nickname: parsed.data.nickname ?? null,
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

  const result = coachId
    ? await supabase.from("coaches").update(row).eq("id", coachId).select("id").single()
    : await supabase.from("coaches").insert(row).select("id").single();

  if (result.error) return mapErrorToAction(result.error);

  const id = result.data.id;
  revalidatePath("/admin/coaches");
  revalidatePath(`/admin/coaches/${id}`);
  revalidatePath("/players");
  revalidatePath(`/coaches/${id}`);
  revalidatePath("/");
  return actionSuccess(he.admin.saved, `/admin/coaches/${id}`);
}
