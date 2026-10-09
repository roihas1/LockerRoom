import type { Media } from "@/types/domain";

const PLACEHOLDER = "placeholder:";

export function isPlaceholderKey(key: string): boolean {
  return key.startsWith(PLACEHOLDER);
}

function placeholderPath(key: string): string | null {
  const name = key.slice(PLACEHOLDER.length).split(":")[0] ?? "";
  if (name.startsWith("player")) return "/placeholders/player.svg";
  if (/^action-\d$/.test(name)) return `/placeholders/${name}.svg`;
  if (name.startsWith("exercise-video") || name === "highlight") return null;
  if (name.startsWith("exercise")) return "/placeholders/exercise.svg";
  if (name === "logo" || name === "cover" || name === "video-poster") return `/placeholders/${name}.svg`;
  return "/placeholders/action-1.svg";
}

export function keyToUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (isPlaceholderKey(key)) return placeholderPath(key);
  const base = process.env.NEXT_PUBLIC_MEDIA_BASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

/** Public URL for the media file itself. Placeholder videos have no playable file and return null. */
export function getMediaUrl(media: Pick<Media, "storageKey"> | null | undefined): string | null {
  return media ? keyToUrl(media.storageKey) : null;
}

export function getPosterUrl(media: Pick<Media, "posterKey" | "storageKey" | "kind">): string {
  if (media.kind === "image") return getMediaUrl(media) ?? "/placeholders/video-poster.svg";
  return keyToUrl(media.posterKey) ?? "/placeholders/video-poster.svg";
}

export function isSvg(url: string): boolean {
  return url.endsWith(".svg");
}
