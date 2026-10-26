import { z } from "zod";
import { he } from "@/config/strings";
import { fromIsraelInputs } from "@/lib/utils/dates";
import { mediaSlotField } from "./media";

const scoreField = z.union([
  z.literal(""),
  z.coerce.number().int(he.validation.integer).min(0, he.validation.nonNegative).max(200, he.validation.tooLarge),
]);

export const gameDetailsFormSchema = z
  .object({
    seasonId: z.coerce.number().int(he.validation.integer).positive(),
    opponent: z.string().trim().min(1, he.validation.required).max(80, he.validation.tooLong(80)),
    roundNumber: z
      .union([z.literal(""), z.coerce.number().int(he.validation.integer).min(1).max(999)])
      .transform((v) => (v === "" ? null : v))
      .nullable(),
    date: z.string().min(1, he.validation.required),
    time: z.string().min(1, he.validation.required),
    location: z
      .string()
      .max(120, he.validation.tooLong(120))
      .transform((v) => (v.trim() === "" ? null : v.trim()))
      .nullable()
      .optional(),
    homeAway: z.enum(["home", "away", "neutral"]),
    status: z.enum(["scheduled", "live", "final", "postponed", "cancelled"]),
    isPractice: z
      .union([z.literal("on"), z.literal("true"), z.literal("1"), z.literal(""), z.null()])
      .optional()
      .transform((v) => v === "on" || v === "true" || v === "1"),
    isCup: z
      .union([z.literal("on"), z.literal("true"), z.literal("1"), z.literal(""), z.null()])
      .optional()
      .transform((v) => v === "on" || v === "true" || v === "1"),
    teamScore: scoreField.transform((v) => (v === "" ? null : v)),
    opponentScore: scoreField.transform((v) => (v === "" ? null : v)),
  })
  .superRefine((data, ctx) => {
    try {
      fromIsraelInputs(data.date, data.time);
    } catch {
      ctx.addIssue({ code: "custom", message: he.validation.invalidDate, path: ["date"] });
    }

    if (data.isPractice && data.isCup) {
      ctx.addIssue({ code: "custom", message: he.validation.practiceOrCup, path: ["isCup"] });
    }

    if (data.status === "final") {
      if (data.teamScore === null || data.opponentScore === null) {
        ctx.addIssue({ code: "custom", message: he.validation.finalNeedsScores, path: ["teamScore"] });
      } else if (data.teamScore === data.opponentScore) {
        ctx.addIssue({ code: "custom", message: he.validation.noTies, path: ["teamScore"] });
      }
    }
  });

export type GameDetailsParsed = z.infer<typeof gameDetailsFormSchema> & { tipoffAt: string };

export function parseGameDetailsForm(formData: FormData) {
  const raw = {
    seasonId: formData.get("seasonId"),
    opponent: formData.get("opponent"),
    roundNumber: formData.get("roundNumber"),
    date: formData.get("date"),
    time: formData.get("time"),
    location: formData.get("location"),
    homeAway: formData.get("homeAway"),
    status: formData.get("status"),
    isPractice: formData.get("isPractice"),
    isCup: formData.get("isCup"),
    teamScore: formData.get("teamScore"),
    opponentScore: formData.get("opponentScore"),
  };
  const parsed = gameDetailsFormSchema.safeParse(raw);
  if (!parsed.success) return parsed;
  let tipoffAt: string;
  try {
    tipoffAt = fromIsraelInputs(parsed.data.date, parsed.data.time);
  } catch {
    return {
      success: false as const,
      error: new z.ZodError([{ code: "custom", message: he.validation.invalidDate, path: ["date"] }]),
    };
  }
  return { success: true as const, data: { ...parsed.data, tipoffAt } };
}

export const gameHighlightsFormSchema = z.object({
  playerOfGameId: z
    .union([z.literal(""), z.coerce.number().int().positive()])
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  potgNote: z
    .string()
    .max(200, he.validation.tooLong(200))
    .transform((v) => (v.trim() === "" ? null : v.trim()))
    .nullable()
    .optional(),
  recap: z
    .string()
    .max(4000, he.validation.tooLong(4000))
    .transform((v) => (v.trim() === "" ? null : v.trim()))
    .nullable()
    .optional(),
  playOfGameMediaId: mediaSlotField,
});

export function parseGameHighlightsForm(formData: FormData) {
  return gameHighlightsFormSchema.safeParse({
    playerOfGameId: formData.get("playerOfGameId"),
    potgNote: formData.get("potgNote"),
    recap: formData.get("recap"),
    playOfGameMediaId: formData.get("playOfGameMediaId"),
  });
}
