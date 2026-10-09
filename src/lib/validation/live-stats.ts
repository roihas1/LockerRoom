import { z } from "zod";
import { zhe } from "@/lib/validation/he";

const liveCoreStat = z.coerce.number().int({ message: zhe.integer }).min(0, zhe.nonNegative).max(999, zhe.tooLarge);

const liveScore = z.coerce.number().int({ message: zhe.integer }).min(0, zhe.nonNegative).max(999, zhe.tooLarge);

export const livePlayerStatLineSchema = z.object({
  playerId: z.coerce.number().int().positive(zhe.invalidPlayer),
  points: liveCoreStat,
  rebounds: liveCoreStat,
  assists: liveCoreStat,
  turnovers: liveCoreStat,
  steals: liveCoreStat,
});

export const saveLiveStatsSchema = z
  .object({
    gameId: z.coerce.number().int().positive(),
    playedPlayerIds: z.array(z.coerce.number().int().positive()).default([]),
    lines: z.array(livePlayerStatLineSchema),
    teamScore: liveScore.optional(),
    opponentScore: liveScore.optional(),
  })
  .superRefine((data, ctx) => {
    const played = new Set(data.playedPlayerIds);
    for (const line of data.lines) {
      if (!played.has(line.playerId)) {
        ctx.addIssue({ code: "custom", message: zhe.invalidPlayer, path: ["lines"] });
      }
    }
    const lineIds = new Set(data.lines.map((l) => l.playerId));
    for (const id of played) {
      if (!lineIds.has(id)) {
        ctx.addIssue({ code: "custom", message: zhe.required, path: ["lines"] });
      }
    }
  });

export type SaveLiveStatsInput = z.infer<typeof saveLiveStatsSchema>;

function parseLiveStatsForm(formData: FormData) {
  const gameId = formData.get("gameId");
  const playedPlayerIds = formData.getAll("playedPlayerIds").map((v) => Number(v));
  const lineIds = [...new Set(playedPlayerIds)];

  const readStat = (playerId: number, key: string) => formData.get(`${key}_${playerId}`) ?? 0;

  const lines = lineIds.map((playerId) => ({
    playerId,
    points: readStat(playerId, "points"),
    rebounds: readStat(playerId, "rebounds"),
    assists: readStat(playerId, "assists"),
    turnovers: readStat(playerId, "turnovers"),
    steals: readStat(playerId, "steals"),
  }));

  const teamRaw = formData.get("teamScore");
  const opponentRaw = formData.get("opponentScore");

  return saveLiveStatsSchema.safeParse({
    gameId,
    playedPlayerIds: lineIds,
    lines,
    ...(teamRaw !== null && teamRaw !== "" ? { teamScore: teamRaw } : {}),
    ...(opponentRaw !== null && opponentRaw !== "" ? { opponentScore: opponentRaw } : {}),
  });
}

export function parseLiveStatsPayload(input: FormData | Record<string, unknown>) {
  if (input instanceof FormData) {
    return parseLiveStatsForm(input);
  }
  return saveLiveStatsSchema.safeParse(input);
}
