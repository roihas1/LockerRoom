"use server";

import { revalidatePath } from "next/cache";
import { he } from "@/config/strings";
import { uploadLimits, MB } from "@/config/uploads";
import { blockDemoMutation } from "@/lib/auth/demo-guard";
import { requireAdmin } from "@/lib/auth/require-admin";
import { revalidatePublic } from "@/lib/cache/revalidate-public";
import { toMedia } from "@/lib/data/mappers";
import { createSessionClient } from "@/lib/supabase/server";
import { actionFail, type ActionResult } from "@/lib/utils/action-result";
import { mapErrorToAction } from "@/lib/utils/errors";
import {
  buildStorageKey,
  checkUpload,
  MEDIA_BUCKET,
  registerMediaSchema,
  uploadRequestSchema,
  type RegisterMediaInput,
  type UploadRequest,
} from "@/lib/validation/media";
import type { Media } from "@/types/domain";

type Failure = Extract<ActionResult, { ok: false }>;

export type UploadTicket = { ok: true; storageKey: string; signedUrl: string } | Failure;
export type RegisteredMedia = { ok: true; media: Media } | Failure;

function fail(result: ActionResult): Failure {
  return result as Failure;
}

/** Issues a one-time signed upload URL for a file the admin is about to upload. */
export async function requestUploadAction(input: UploadRequest): Promise<UploadTicket> {
  await requireAdmin();
  const demoBlock = blockDemoMutation();
  if (demoBlock) return fail(demoBlock);

  const parsed = uploadRequestSchema.safeParse(input);
  if (!parsed.success) return fail(actionFail(he.upload.badType, "validation"));

  const check = checkUpload(parsed.data.mimeType, parsed.data.sizeBytes);
  if (!check.ok) {
    if (check.reason === "bad_type") return fail(actionFail(he.upload.badType, "bad_type"));
    const kind = parsed.data.mimeType.startsWith("video/") ? "video" : "image";
    return fail(actionFail(he.upload.tooLarge(uploadLimits[kind].maxBytes / MB), "too_large"));
  }

  const storageKey = buildStorageKey(check.kind, parsed.data.scope, check.ext, crypto.randomUUID());
  const supabase = await createSessionClient();
  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).createSignedUploadUrl(storageKey);
  if (error || !data) return fail(actionFail(he.errors.uploadFailed, "storage"));

  return { ok: true, storageKey, signedUrl: data.signedUrl };
}

/** Records an uploaded file in the media table after the browser finished uploading it. */
export async function registerMediaAction(input: RegisterMediaInput): Promise<RegisteredMedia> {
  const session = await requireAdmin();
  const demoBlock = blockDemoMutation();
  if (demoBlock) return fail(demoBlock);

  const parsed = registerMediaSchema.safeParse(input);
  if (!parsed.success) return fail(actionFail(he.errors.uploadFailed, "validation"));
  const data = parsed.data;

  const supabase = await createSessionClient();
  const { data: exists } = await supabase.storage.from(MEDIA_BUCKET).exists(data.storageKey);
  if (!exists) return fail(actionFail(he.errors.uploadFailed, "missing_object"));

  let sortOrder = 0;
  if (data.gameId || data.postId) {
    const column = data.gameId ? "game_id" : "post_id";
    const { data: last } = await supabase
      .from("media")
      .select("sort_order")
      .eq(column, (data.gameId ?? data.postId)!)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    sortOrder = (last?.sort_order ?? -1) + 1;
  }

  const { data: row, error } = await supabase
    .from("media")
    .insert({
      kind: data.mimeType.startsWith("video/") ? "video" : "image",
      storage_key: data.storageKey,
      mime_type: data.mimeType,
      size_bytes: data.sizeBytes,
      width: data.width ?? null,
      height: data.height ?? null,
      duration_seconds: data.durationSeconds ?? null,
      game_id: data.gameId ?? null,
      post_id: data.postId ?? null,
      sort_order: sortOrder,
      created_by: session.userId,
    })
    .select("*")
    .single();
  if (error || !row) return fail(mapErrorToAction(error ?? { message: "missing" }));

  if (data.gameId || data.postId) revalidatePublic();
  if (data.gameId) revalidatePath(`/games/${data.gameId}`);
  if (data.postId) revalidatePath("/locker-room");
  return { ok: true, media: toMedia(row) };
}

/** Removes a media row and its stored file. Slots referencing it are nulled by foreign keys. */
export async function deleteMediaAction(mediaId: string): Promise<ActionResult> {
  await requireAdmin();
  const demoBlock = blockDemoMutation();
  if (demoBlock) return demoBlock;

  const supabase = await createSessionClient();
  const { data: row, error: loadError } = await supabase
    .from("media")
    .select("storage_key, game_id, post_id")
    .eq("id", mediaId)
    .maybeSingle();
  if (loadError) return mapErrorToAction(loadError);
  if (!row) return actionFail(he.errors.notFound, "not_found");

  const { error } = await supabase.from("media").delete().eq("id", mediaId);
  if (error) return mapErrorToAction(error);
  await supabase.storage.from(MEDIA_BUCKET).remove([row.storage_key]);

  revalidatePublic();
  if (row.game_id) revalidatePath(`/games/${row.game_id}`);
  if (row.post_id) revalidatePath("/locker-room");
  revalidatePath("/");
  return { ok: true, message: he.admin.deleted };
}
