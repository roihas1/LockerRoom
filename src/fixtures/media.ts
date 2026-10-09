import type { Media, MediaKind } from "@/types/domain";

let counter = 0;

function fixtureUuid(seed: string): string {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const hex = (n: number) => n.toString(16).padStart(8, "0");
  const a = hex(h);
  const b = hex(Math.imul(h, 2654435761) >>> 0);
  const c = hex(Math.imul(h ^ 0x5bd1e995, 40503) >>> 0);
  return `${a}-${b.slice(0, 4)}-4${b.slice(5, 8)}-a${c.slice(1, 4)}-${c}${a.slice(0, 4)}`;
}

export function placeholderMedia(name: string, kind: MediaKind, extra: Partial<Media> = {}): Media {
  counter++;
  const id = fixtureUuid(`${name}-${counter}-${extra.gameId ?? ""}-${extra.caption ?? ""}`);
  return {
    id,
    kind,
    storageKey: `placeholder:${name}:${id.slice(0, 8)}`,
    posterKey: kind === "video" ? "placeholder:video-poster" : null,
    title: null,
    caption: null,
    mimeType: kind === "image" ? "image/svg+xml" : "video/mp4",
    sizeBytes: null,
    width: 1600,
    height: 1000,
    durationSeconds: kind === "video" ? 24 : null,
    gameId: null,
    postId: null,
    sortOrder: counter,
    playerIds: [],
    createdAt: "2026-09-01T10:00:00.000Z",
    ...extra,
  };
}
