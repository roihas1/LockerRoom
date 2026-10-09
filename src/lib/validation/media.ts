import { z } from "zod";
import { extensionForMime, kindForMime, uploadLimits, uploadScopes, type UploadScope } from "@/config/uploads";
import type { MediaKind } from "@/types/domain";

export const MEDIA_BUCKET = "media";

/**
 * Optional media slot in a form. A missing field means "leave unchanged" (undefined),
 * an empty string means "clear" (null), anything else must be a media id.
 */
export const mediaSlotField = z
  .union([z.literal(""), z.uuid()])
  .nullish()
  .transform((v) => (v === undefined || v === null ? undefined : v === "" ? null : v));

export function parseMediaSlot(formData: FormData, name: string) {
  return mediaSlotField.safeParse(formData.get(name));
}

export const uploadRequestSchema = z.object({
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  scope: z.enum(uploadScopes),
});

export type UploadRequest = z.infer<typeof uploadRequestSchema>;

export type UploadCheck = { ok: true; kind: MediaKind; ext: string } | { ok: false; reason: "bad_type" | "too_large" };

export function checkUpload(mimeType: string, sizeBytes: number): UploadCheck {
  const kind = kindForMime(mimeType);
  if (!kind) return { ok: false, reason: "bad_type" };
  if (sizeBytes > uploadLimits[kind].maxBytes) return { ok: false, reason: "too_large" };
  return { ok: true, kind, ext: extensionForMime(mimeType) };
}

export function buildStorageKey(kind: MediaKind, scope: UploadScope, ext: string, id: string): string {
  return `${kind === "image" ? "images" : "videos"}/${scope}/${id}.${ext}`;
}

const storageKeyPattern = new RegExp(
  `^(images|videos)/(${uploadScopes.join("|")})/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|png|webp|mp4|webm)$`,
);

/** True when `key` is a path this app would have issued for a file of `mimeType`. */
export function isValidStorageKey(key: string, mimeType: string): boolean {
  const kind = kindForMime(mimeType);
  if (!kind || !storageKeyPattern.test(key)) return false;
  const [folder] = key.split("/");
  return folder === (kind === "image" ? "images" : "videos") && key.endsWith(`.${extensionForMime(mimeType)}`);
}

const optionalPositiveInt = z.number().int().positive().max(100_000).nullable().optional();

export const registerMediaSchema = z
  .object({
    storageKey: z.string().min(1).max(200),
    mimeType: z.string().min(1),
    sizeBytes: z.number().int().positive(),
    width: optionalPositiveInt,
    height: optionalPositiveInt,
    durationSeconds: z.number().nonnegative().max(100_000).nullable().optional(),
    gameId: z.number().int().positive().nullable().optional(),
    postId: z.number().int().positive().nullable().optional(),
  })
  .refine((v) => !(v.gameId && v.postId), { path: ["gameId"] })
  .refine((v) => isValidStorageKey(v.storageKey, v.mimeType), { path: ["storageKey"] });

export type RegisterMediaInput = z.input<typeof registerMediaSchema>;
