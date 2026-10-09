import { z } from "zod";
import { he } from "@/config/strings";
import { mediaSlotField } from "./media";

const optionalText = (max: number) =>
  z
    .string()
    .max(max, he.validation.tooLong(max))
    .transform((v) => (v.trim() === "" ? null : v.trim()))
    .nullable()
    .optional();

export const awardFormSchema = z.object({
  seasonId: z.coerce.number().int(he.validation.integer).positive(),
  title: z.string().trim().min(1, he.validation.required).max(80, he.validation.tooLong(80)),
  emoji: optionalText(16),
  category: z.enum(["official", "fun"], he.validation.invalidOption).default("fun"),
  description: optionalText(500),
  playerId: z.coerce.number().int(he.validation.integer).positive(he.validation.invalidPlayer),
  gameId: z
    .union([z.literal(""), z.coerce.number().int(he.validation.integer).positive()])
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  awardedOn: z.string().min(1, he.validation.required),
  shareToFeed: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
    .transform((v) => v === "on" || v === "true")
    .optional(),
  imageMediaId: mediaSlotField,
});

export function parseAwardForm(formData: FormData) {
  return awardFormSchema.safeParse({
    seasonId: formData.get("seasonId"),
    title: formData.get("title"),
    emoji: formData.get("emoji"),
    category: formData.get("category") ?? "fun",
    description: formData.get("description"),
    playerId: formData.get("playerId"),
    gameId: formData.get("gameId"),
    awardedOn: formData.get("awardedOn"),
    shareToFeed: formData.get("shareToFeed"),
    imageMediaId: formData.get("imageMediaId"),
  });
}
