import { z } from "zod";
import type { PlayDiagram, PlayPlayerId } from "@/types/play-diagram";
import { PLAY_PLAYER_IDS } from "@/types/play-diagram";

const pointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

const playerIdSchema = z.enum(PLAY_PLAYER_IDS);

const positionsSchema = z
  .record(z.string(), pointSchema)
  .refine((p) => PLAY_PLAYER_IDS.every((id) => p[id] != null), { message: "missing players" });

const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("pass"), from: playerIdSchema, to: playerIdSchema }),
  z.object({ type: z.literal("shoot"), shooter: playerIdSchema }),
]);

const stepSchema = z.object({
  caption: z.string().max(300),
  positions: positionsSchema,
  ballHolder: playerIdSchema,
  action: actionSchema.optional(),
});

export const playDiagramSchema = z.object({
  version: z.literal(1),
  steps: z.array(stepSchema).min(1).max(40),
});

/** Parse unknown JSON into a PlayDiagram, or null if missing/invalid. */
export function parsePlayDiagram(raw: unknown): PlayDiagram | null {
  if (raw == null || raw === "") return null;
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  const result = playDiagramSchema.safeParse(value);
  if (!result.success) return null;
  return {
    version: 1,
    steps: result.data.steps.map((step) => ({
      caption: step.caption.trim(),
      positions: PLAY_PLAYER_IDS.reduce(
        (acc, id) => {
          acc[id] = step.positions[id]!;
          return acc;
        },
        {} as PlayDiagram["steps"][number]["positions"],
      ),
      ballHolder: step.ballHolder as PlayPlayerId,
      ...(step.action ? { action: step.action } : {}),
    })),
  };
}
