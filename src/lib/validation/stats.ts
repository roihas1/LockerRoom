import { z } from "zod";
import { zhe } from "@/lib/validation/he";

const coreStat = z.coerce.number().int({ message: zhe.integer }).min(0, zhe.nonNegative).max(999, zhe.tooLarge);

const optionalStat = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : v),
  z
    .union([
      z.null(),
      z.coerce.number().int({ message: zhe.integer }).min(0, zhe.nonNegative).max(99, zhe.tooLarge),
    ]),
);

function shootingRefine(
  data: {
    fgMade: number | null;
    fgAttempted: number | null;
    threeMade: number | null;
    threeAttempted: number | null;
    ftMade: number | null;
    ftAttempted: number | null;
  },
  ctx: z.RefinementCtx,
) {
  const pair = (
    made: number | null,
    attempted: number | null,
    madeKey: string,
    attemptedKey: string,
  ) => {
    if (made !== null && attempted === null) {
      ctx.addIssue({ code: "custom", message: zhe.madeWithoutAttempted, path: [attemptedKey] });
    }
    if (made !== null && attempted !== null && made > attempted) {
      ctx.addIssue({ code: "custom", message: zhe.madeOverAttempted, path: [madeKey] });
    }
  };

  pair(data.fgMade, data.fgAttempted, "fgMade", "fgAttempted");
  pair(data.threeMade, data.threeAttempted, "threeMade", "threeAttempted");
  pair(data.ftMade, data.ftAttempted, "ftMade", "ftAttempted");

  if (data.threeMade !== null && data.fgMade !== null && data.threeMade > data.fgMade) {
    ctx.addIssue({ code: "custom", message: zhe.threesOverFg, path: ["threeMade"] });
  }
  if (data.threeAttempted !== null && data.fgAttempted !== null && data.threeAttempted > data.fgAttempted) {
    ctx.addIssue({ code: "custom", message: zhe.threesOverFg, path: ["threeAttempted"] });
  }
}

export const playerStatLineSchema = z
  .object({
    playerId: z.coerce.number().int().positive(zhe.invalidPlayer),
    points: coreStat,
    rebounds: coreStat,
    assists: coreStat,
    steals: optionalStat,
    blocks: optionalStat,
    turnovers: optionalStat,
    fouls: optionalStat,
    fgMade: optionalStat,
    fgAttempted: optionalStat,
    threeMade: optionalStat,
    threeAttempted: optionalStat,
    ftMade: optionalStat,
    ftAttempted: optionalStat,
  })
  .superRefine(shootingRefine);

export const saveGameStatsSchema = z
  .object({
    gameId: z.coerce.number().int().positive(),
    playedIds: z.array(z.coerce.number().int().positive()).default([]),
    lines: z.array(playerStatLineSchema),
  })
  .superRefine((data, ctx) => {
    const played = new Set(data.playedIds);
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

export type SaveGameStatsInput = z.infer<typeof saveGameStatsSchema>;

export function parseSaveGameStatsForm(formData: FormData) {
  const gameId = formData.get("gameId");
  const playedIds = formData.getAll("played").map((v) => Number(v));
  const lineIds = [...new Set(playedIds)];

  const readOptional = (playerId: number, key: string) => {
    const raw = formData.get(`${key}_${playerId}`);
    if (raw === null || raw === "") return null;
    return raw;
  };

  const lines = lineIds.map((playerId) => ({
    playerId,
    points: formData.get(`points_${playerId}`) ?? 0,
    rebounds: formData.get(`rebounds_${playerId}`) ?? 0,
    assists: formData.get(`assists_${playerId}`) ?? 0,
    steals: readOptional(playerId, "steals"),
    blocks: readOptional(playerId, "blocks"),
    turnovers: readOptional(playerId, "turnovers"),
    fouls: readOptional(playerId, "fouls"),
    fgMade: readOptional(playerId, "fgMade"),
    fgAttempted: readOptional(playerId, "fgAttempted"),
    threeMade: readOptional(playerId, "threeMade"),
    threeAttempted: readOptional(playerId, "threeAttempted"),
    ftMade: readOptional(playerId, "ftMade"),
    ftAttempted: readOptional(playerId, "ftAttempted"),
  }));

  return saveGameStatsSchema.safeParse({ gameId, playedIds: lineIds, lines });
}

export function zodFieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    out[key] ??= [];
    out[key].push(issue.message);
  }
  return out;
}
