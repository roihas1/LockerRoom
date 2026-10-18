"use server";

import { revalidatePath } from "next/cache";
import { blockDemoMutation } from "@/lib/auth/demo-guard";
import { requireAdmin } from "@/lib/auth/require-admin";
import { revalidatePublic } from "@/lib/cache/revalidate-public";
import { he } from "@/config/strings";
import { notifyNewPlay } from "@/lib/push/notify";
import { createSessionClient } from "@/lib/supabase/server";
import { actionFail, actionFromZod, actionSuccess, type ActionResult } from "@/lib/utils/action-result";
import { mapErrorToAction } from "@/lib/utils/errors";
import { parseExerciseForm } from "@/lib/validation/exercise";

type Client = Awaited<ReturnType<typeof createSessionClient>>;

function revalidateExercisePaths(id: number) {
  revalidatePublic();
  revalidatePath("/admin/plays");
  revalidatePath(`/admin/plays/${id}`);
  revalidatePath("/plays");
  revalidatePath(`/plays/${id}`);
  revalidatePath(`/plays/${id}/practice`);
  revalidatePath("/admin/locker-room");
  revalidatePath("/locker-room");
  revalidatePath("/");
}

/** Publishing a play shares it to the locker room feed; unpublishing hides that post. */
async function syncPlayFeedPost(supabase: Client, exerciseId: number, publish: boolean) {
  const { data: existing } = await supabase.from("locker_room_posts").select("id, is_published").eq("exercise_id", exerciseId).maybeSingle();
  if (!publish) {
    if (existing) await supabase.from("locker_room_posts").update({ is_published: false }).eq("id", existing.id);
    return;
  }
  const { data: exercise } = await supabase.from("exercises").select("title").eq("id", exerciseId).single();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const row = {
    type: "play" as const,
    title: exercise?.title ?? null,
    exercise_id: exerciseId,
    is_published: true,
    published_at: new Date().toISOString(),
  };
  if (existing) {
    await supabase.from("locker_room_posts").update(row).eq("id", existing.id);
  } else {
    await supabase.from("locker_room_posts").insert({ ...row, created_by: user?.id ?? null });
  }
  if (!existing?.is_published) notifyNewPlay(exerciseId, exercise?.title ?? "");
}

export async function saveExerciseAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const demoBlock = blockDemoMutation();
  if (demoBlock) return demoBlock;

  const exerciseIdRaw = formData.get("exerciseId");
  const exerciseId = exerciseIdRaw ? Number(exerciseIdRaw) : null;
  const parsed = parseExerciseForm(formData);
  if (!parsed.success) return actionFromZod(parsed.error);

  const supabase = await createSessionClient();
  const row = {
    title: parsed.data.title,
    category: parsed.data.category,
    description: parsed.data.description ?? null,
    instructions: parsed.data.instructions,
    coaching_points: parsed.data.coachingPoints,
    duration_minutes: parsed.data.durationMinutes,
    difficulty: parsed.data.difficulty,
    sort_order: parsed.data.sortOrder,
    ...(parsed.data.videoMediaId !== undefined ? { video_media_id: parsed.data.videoMediaId } : {}),
    ...(parsed.data.thumbnailMediaId !== undefined ? { thumbnail_media_id: parsed.data.thumbnailMediaId } : {}),
    ...(parsed.data.diagram !== undefined ? { diagram: parsed.data.diagram } : {}),
  };

  const result = exerciseId
    ? await supabase.from("exercises").update(row).eq("id", exerciseId).select("id").single()
    : await supabase.from("exercises").insert({ ...row, is_published: false }).select("id").single();

  if (result.error) return mapErrorToAction(result.error);

  const id = result.data.id;
  const publish = formData.get("intent") === "publish";
  if (publish) {
    const { error: publishError } = await supabase.from("exercises").update({ is_published: true }).eq("id", id);
    if (publishError) return mapErrorToAction(publishError);
    await syncPlayFeedPost(supabase, id, true);
  } else if (exerciseId) {
    await supabase.from("locker_room_posts").update({ title: row.title }).eq("exercise_id", id);
  }
  revalidateExercisePaths(id);
  return actionSuccess(publish ? he.admin.playPublished : he.admin.saved, `/admin/plays/${id}`);
}

export async function publishExerciseAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const demoBlock = blockDemoMutation();
  if (demoBlock) return demoBlock;

  const exerciseId = Number(formData.get("exerciseId"));
  const publish = formData.get("publish") === "true";
  if (!exerciseId) return actionFail(he.errors.notFound, "not_found");

  const supabase = await createSessionClient();
  const { error } = await supabase.from("exercises").update({ is_published: publish }).eq("id", exerciseId);
  if (error) return mapErrorToAction(error);

  await syncPlayFeedPost(supabase, exerciseId, publish);
  revalidateExercisePaths(exerciseId);
  return actionSuccess(publish ? he.admin.playPublished : he.admin.draft);
}

export async function deleteExerciseAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const demoBlock = blockDemoMutation();
  if (demoBlock) return demoBlock;

  const exerciseId = Number(formData.get("exerciseId"));
  if (!exerciseId) return actionFail(he.errors.notFound, "not_found");

  const supabase = await createSessionClient();
  const { error } = await supabase.from("exercises").delete().eq("id", exerciseId);
  if (error) return mapErrorToAction(error);

  revalidatePublic();
  revalidatePath("/admin/plays");
  revalidatePath("/plays");
  revalidatePath("/locker-room");
  revalidatePath("/");
  return actionSuccess(he.admin.deleted, "/admin/plays");
}
