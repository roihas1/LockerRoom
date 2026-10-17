"use server";

import { revalidatePath } from "next/cache";
import { createSeasonPirAwardDraft } from "@/lib/admin/pir-award";
import { blockDemoMutation } from "@/lib/auth/demo-guard";
import { requireAdmin } from "@/lib/auth/require-admin";
import { revalidatePublic } from "@/lib/cache/revalidate-public";
import { he } from "@/config/strings";
import { notifyFeedPost } from "@/lib/push/notify";
import { createSessionClient } from "@/lib/supabase/server";
import { actionFail, actionFromZod, actionSuccess, type ActionResult } from "@/lib/utils/action-result";
import { mapErrorToAction } from "@/lib/utils/errors";
import { parseAwardForm } from "@/lib/validation/award";
import { parsePostForm } from "@/lib/validation/post";

function revalidatePostPaths(id: number) {
  revalidatePublic();
  revalidatePath("/admin/locker-room");
  revalidatePath(`/admin/locker-room/${id}`);
  revalidatePath("/locker-room");
  revalidatePath("/");
}

function revalidateAwardPaths(id: number) {
  revalidatePublic();
  revalidatePath("/admin/locker-room/awards");
  revalidatePath(`/admin/locker-room/awards/${id}`);
  revalidatePath("/locker-room");
  revalidatePath("/");
}

async function syncAwardFeedPost(
  supabase: Awaited<ReturnType<typeof createSessionClient>>,
  awardId: number,
  opts: { title: string; body: string | null; isPublished: boolean; userId: string | undefined },
) {
  const { data: existing } = await supabase.from("locker_room_posts").select("id, is_published").eq("award_id", awardId).maybeSingle();
  const row = {
    type: "award" as const,
    title: opts.title,
    body: opts.body,
    award_id: awardId,
    is_published: opts.isPublished,
    published_at: new Date().toISOString(),
    created_by: opts.userId ?? null,
  };
  let postId = existing?.id ?? null;
  if (existing) {
    await supabase.from("locker_room_posts").update(row).eq("id", existing.id);
  } else {
    const { data } = await supabase.from("locker_room_posts").insert(row).select("id").single();
    postId = data?.id ?? null;
  }
  if (opts.isPublished && !existing?.is_published && postId) notifyFeedPost(postId, opts.title, { kind: "award" });
}

export async function savePostAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const demoBlock = blockDemoMutation();
  if (demoBlock) return demoBlock;

  const postIdRaw = formData.get("postId");
  const postId = postIdRaw ? Number(postIdRaw) : null;
  const parsed = parsePostForm(formData);
  if (!parsed.success) return actionFromZod(parsed.error);

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const row = {
    type: parsed.data.type,
    title: parsed.data.title ?? null,
    body: parsed.data.body ?? null,
    quote_player_id: parsed.data.quotePlayerId,
    game_id: parsed.data.gameId,
    award_id: parsed.data.awardId,
    is_pinned: parsed.data.isPinned ?? false,
  };

  const result = postId
    ? await supabase.from("locker_room_posts").update(row).eq("id", postId).select("id").single()
    : await supabase
        .from("locker_room_posts")
        .insert({ ...row, is_published: false, created_by: user?.id ?? null })
        .select("id")
        .single();

  if (result.error) return mapErrorToAction(result.error);

  revalidatePostPaths(result.data.id);
  return actionSuccess(he.admin.saved, `/admin/locker-room/${result.data.id}`);
}

export async function publishPostAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const demoBlock = blockDemoMutation();
  if (demoBlock) return demoBlock;

  const postId = Number(formData.get("postId"));
  const publish = formData.get("publish") === "true";
  if (!postId) return actionFail(he.errors.notFound, "not_found");

  const supabase = await createSessionClient();
  const { data: before } = await supabase.from("locker_room_posts").select("is_published, title, body").eq("id", postId).maybeSingle();
  const { error } = await supabase
    .from("locker_room_posts")
    .update({ is_published: publish, published_at: new Date().toISOString() })
    .eq("id", postId);
  if (error) return mapErrorToAction(error);

  if (publish && before && !before.is_published) notifyFeedPost(postId, before.title ?? before.body?.slice(0, 120) ?? null);
  revalidatePostPaths(postId);
  return actionSuccess(publish ? he.admin.published : he.admin.draft);
}

export async function deletePostAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const demoBlock = blockDemoMutation();
  if (demoBlock) return demoBlock;

  const postId = Number(formData.get("postId"));
  if (!postId) return actionFail(he.errors.notFound, "not_found");

  const supabase = await createSessionClient();
  const { error } = await supabase.from("locker_room_posts").delete().eq("id", postId);
  if (error) return mapErrorToAction(error);

  revalidatePublic();
  revalidatePath("/admin/locker-room");
  revalidatePath("/locker-room");
  return actionSuccess(he.admin.deleted, "/admin/locker-room");
}

export async function saveAwardAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const demoBlock = blockDemoMutation();
  if (demoBlock) return demoBlock;

  const awardIdRaw = formData.get("awardId");
  const awardId = awardIdRaw ? Number(awardIdRaw) : null;
  const parsed = parseAwardForm(formData);
  if (!parsed.success) return actionFromZod(parsed.error);

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const row = {
    season_id: parsed.data.seasonId,
    title: parsed.data.title,
    emoji: parsed.data.emoji ?? null,
    category: parsed.data.category,
    description: parsed.data.description ?? null,
    player_id: parsed.data.playerId,
    game_id: parsed.data.gameId,
    awarded_on: parsed.data.awardedOn,
    ...(parsed.data.imageMediaId !== undefined ? { image_media_id: parsed.data.imageMediaId } : {}),
  };

  const result = awardId
    ? await supabase.from("awards").update(row).eq("id", awardId).select("id, is_published").single()
    : await supabase.from("awards").insert({ ...row, is_published: false }).select("id, is_published").single();

  if (result.error) return mapErrorToAction(result.error);

  const id = result.data.id;
  if (parsed.data.shareToFeed) {
    await syncAwardFeedPost(supabase, id, {
      title: parsed.data.title,
      body: parsed.data.description ?? null,
      isPublished: result.data.is_published,
      userId: user?.id,
    });
  }

  revalidateAwardPaths(id);
  return actionSuccess(he.admin.saved, `/admin/locker-room/awards/${id}`);
}

export async function publishAwardAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const demoBlock = blockDemoMutation();
  if (demoBlock) return demoBlock;

  const awardId = Number(formData.get("awardId"));
  const publish = formData.get("publish") === "true";
  const shareToFeed = formData.get("shareToFeed") === "true";
  if (!awardId) return actionFail(he.errors.notFound, "not_found");

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: award, error: loadError } = await supabase.from("awards").select("title, description").eq("id", awardId).single();
  if (loadError || !award) return mapErrorToAction(loadError ?? { message: "missing" });

  const { error } = await supabase.from("awards").update({ is_published: publish }).eq("id", awardId);
  if (error) return mapErrorToAction(error);

  if (shareToFeed) {
    await syncAwardFeedPost(supabase, awardId, {
      title: award.title,
      body: award.description,
      isPublished: publish,
      userId: user?.id,
    });
  }

  revalidateAwardPaths(awardId);
  return actionSuccess(publish ? he.admin.published : he.admin.draft);
}

export async function deleteAwardAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const demoBlock = blockDemoMutation();
  if (demoBlock) return demoBlock;

  const awardId = Number(formData.get("awardId"));
  if (!awardId) return actionFail(he.errors.notFound, "not_found");

  const supabase = await createSessionClient();
  const { error } = await supabase.from("awards").delete().eq("id", awardId);
  if (error) return mapErrorToAction(error);

  revalidatePublic();
  revalidatePath("/admin/locker-room/awards");
  revalidatePath("/locker-room");
  return actionSuccess(he.admin.deleted, "/admin/locker-room/awards");
}

export async function createSeasonPirAwardAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const demoBlock = blockDemoMutation();
  if (demoBlock) return demoBlock;

  const seasonId = Number(formData.get("seasonId"));
  if (!seasonId) return actionFail(he.errors.notFound, "not_found");

  const supabase = await createSessionClient();
  const result = await createSeasonPirAwardDraft(supabase, seasonId);

  if (result.status === "failed") return actionFail(he.fun.pirAward.failed, "failed");
  if (result.status === "empty") return actionFail(he.fun.pirAward.empty, "empty");
  if (result.status === "published") {
    return actionSuccess(he.fun.pirAward.published, result.awardId ? `/admin/locker-room/awards/${result.awardId}` : undefined);
  }
  if (result.status === "exists") {
    return actionSuccess(he.fun.pirAward.draftExists, result.awardId ? `/admin/locker-room/awards/${result.awardId}` : undefined);
  }

  revalidatePublic();
  revalidatePath("/admin/locker-room/awards");
  if (result.awardId) revalidatePath(`/admin/locker-room/awards/${result.awardId}`);
  return actionSuccess(he.fun.pirAward.draftCreated, `/admin/locker-room/awards/${result.awardId}`);
}
