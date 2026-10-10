import type { ReactionCounts, ReactionKind } from "@/types/domain";

export const reactionKinds: readonly ReactionKind[] = ["laugh", "fire", "brick", "goat", "heart", "clap", "shock", "cry", "skull"];

/** Always shown on the bar; the rest live in the picker until someone uses them. */
export const primaryReactionKinds: readonly ReactionKind[] = ["laugh", "fire", "brick", "goat"];

export const reactionEmoji: Record<ReactionKind, string> = {
  laugh: "😂",
  fire: "🔥",
  brick: "🧱",
  goat: "🐐",
  heart: "❤️",
  clap: "👏",
  shock: "😱",
  cry: "😭",
  skull: "💀",
};

export function emptyReactions(): ReactionCounts {
  return { laugh: 0, fire: 0, brick: 0, goat: 0, heart: 0, clap: 0, shock: 0, cry: 0, skull: 0 };
}

export function isReactionKind(value: unknown): value is ReactionKind {
  return typeof value === "string" && (reactionKinds as readonly string[]).includes(value);
}

/** Builds full counts from a sparse `{ kind: total }` object, ignoring unknown keys. */
export function toReactionCounts(raw: Record<string, number> | null | undefined): ReactionCounts {
  const counts = emptyReactions();
  for (const [kind, total] of Object.entries(raw ?? {})) if (isReactionKind(kind)) counts[kind] = total;
  return counts;
}

/** Post id with the most laughs in the last `days`, or null when nobody laughed. */
export function funniestPostId(
  items: { id: number; publishedAt: string; reactions: ReactionCounts }[],
  days = 30,
  now = Date.now(),
): number | null {
  const since = now - days * 24 * 60 * 60 * 1000;
  let best: { id: number; laughs: number } | null = null;
  for (const item of items) {
    if (Date.parse(item.publishedAt) < since) continue;
    const laughs = item.reactions.laugh;
    if (laughs > 0 && (!best || laughs > best.laughs)) best = { id: item.id, laughs };
  }
  return best?.id ?? null;
}
