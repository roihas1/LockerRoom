import type { MediaKind } from "@/types/domain";

export const MB = 1024 * 1024;

export const uploadLimits: Record<MediaKind, { maxBytes: number; mimeTypes: readonly string[]; extensions: readonly string[] }> = {
  image: {
    maxBytes: 15 * MB,
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
    extensions: ["jpg", "jpeg", "png", "webp"],
  },
  video: {
    maxBytes: 500 * MB,
    mimeTypes: ["video/mp4", "video/webm"],
    extensions: ["mp4", "webm"],
  },
};

export const presignExpirySeconds = 15 * 60;

export const uploadScopes = ["team", "players", "games", "locker-room", "exercises", "posters"] as const;
export type UploadScope = (typeof uploadScopes)[number];

export function extensionForMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "video/mp4":
      return "mp4";
    case "video/webm":
      return "webm";
    default:
      throw new Error(`Unsupported mime type: ${mime}`);
  }
}

export function kindForMime(mime: string): MediaKind | null {
  if (uploadLimits.image.mimeTypes.includes(mime)) return "image";
  if (uploadLimits.video.mimeTypes.includes(mime)) return "video";
  return null;
}
