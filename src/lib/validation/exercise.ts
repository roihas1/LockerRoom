import { z } from "zod";
import { he } from "@/config/strings";
import { playDiagramSchema } from "@/lib/play-diagram/parse";
import { mediaSlotField } from "./media";

const optionalText = (max: number) =>
  z
    .string()
    .max(max, he.validation.tooLong(max))
    .transform((v) => (v.trim() === "" ? null : v.trim()))
    .nullable()
    .optional();

const line = z.string().trim().min(1, he.validation.required).max(500, he.validation.tooLong(500));

export const exerciseFormSchema = z.object({
  title: z.string().trim().min(1, he.validation.required).max(120, he.validation.tooLong(120)),
  category: z.enum(
    ["pick_and_roll", "set_play", "motion", "inbound", "fast_break", "zone_offense", "late_game"],
    he.validation.invalidOption,
  ),
  description: optionalText(1000),
  instructions: z.array(line).default([]),
  coachingPoints: z.array(line).default([]),
  durationMinutes: z
    .union([z.literal(""), z.coerce.number().int(he.validation.integer).min(1).max(240)])
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  difficulty: z
    .union([z.literal(""), z.enum(["easy", "medium", "hard"])])
    .transform((v) => (v === "" ? null : v)),
  sortOrder: z.coerce.number().int(he.validation.integer).min(0).max(9999).default(0),
  videoMediaId: mediaSlotField,
  thumbnailMediaId: mediaSlotField,
  diagram: z
    .string()
    .optional()
    .transform((raw, ctx) => {
      if (raw == null || raw.trim() === "") return null;
      try {
        const parsed = playDiagramSchema.safeParse(JSON.parse(raw));
        if (!parsed.success) {
          ctx.addIssue({ code: "custom", message: he.validation.invalidOption });
          return z.NEVER;
        }
        return parsed.data;
      } catch {
        ctx.addIssue({ code: "custom", message: he.validation.invalidOption });
        return z.NEVER;
      }
    }),
});

export function parseStringList(formData: FormData, name: string): string[] {
  return formData
    .getAll(name)
    .map((v) => String(v).trim())
    .filter((v) => v.length > 0);
}

export function parseExerciseForm(formData: FormData) {
  return exerciseFormSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    description: formData.get("description"),
    instructions: parseStringList(formData, "instructions"),
    coachingPoints: parseStringList(formData, "coachingPoints"),
    durationMinutes: formData.get("durationMinutes"),
    difficulty: formData.get("difficulty"),
    sortOrder: formData.get("sortOrder") ?? "0",
    videoMediaId: formData.get("videoMediaId"),
    thumbnailMediaId: formData.get("thumbnailMediaId"),
    diagram: formData.get("diagram") == null ? undefined : String(formData.get("diagram")),
  });
}
