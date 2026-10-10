import { z } from "zod";
import { he } from "@/config/strings";
import { mediaSlotField } from "./media";

export const optionalText = (max: number) =>
  z
    .string()
    .max(max, he.validation.tooLong(max))
    .transform((v) => (v.trim() === "" ? null : v.trim()))
    .nullable()
    .optional();

export const hashtagField = z
  .string()
  .transform((v) => v.trim().replace(/^#+/, ""))
  .pipe(
    z
      .string()
      .max(30, he.validation.tooLong(30))
      .regex(/^[^\s#]*$/, he.validation.hashtag),
  )
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

export const activeField = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
  .transform((v) => v === "on" || v === "true")
  .optional();

export const playerFormSchema = z.object({
  name: z.string().trim().min(1, he.validation.required).max(80, he.validation.tooLong(80)),
  jerseyNumber: z
    .union([z.literal(""), z.coerce.number().int(he.validation.integer).min(0, he.validation.jersey).max(99, he.validation.jersey)])
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  position: z
    .union([z.literal(""), z.enum(["guard", "forward", "center"])])
    .transform((v) => (v === "" ? null : v)),
  heightCm: z
    .union([z.literal(""), z.coerce.number().int(he.validation.integer).min(140, he.validation.height).max(230, he.validation.height)])
    .transform((v) => (v === "" ? null : v))
    .nullable(),
  nickname: optionalText(40),
  teamRole: optionalText(80),
  description: optionalText(500),
  strength: optionalText(200),
  weakness: optionalText(200),
  quote: optionalText(200),
  intro: optionalText(160),
  hashtag: hashtagField,
  sortOrder: z.coerce.number().int(he.validation.integer).min(0).max(9999).default(0),
  isActive: activeField,
  photoMediaId: mediaSlotField,
});

export type PlayerFormValues = z.infer<typeof playerFormSchema>;

export function parsePlayerForm(formData: FormData) {
  return playerFormSchema.safeParse({
    name: formData.get("name"),
    jerseyNumber: formData.get("jerseyNumber"),
    position: formData.get("position"),
    heightCm: formData.get("heightCm"),
    nickname: formData.get("nickname"),
    teamRole: formData.get("teamRole"),
    description: formData.get("description"),
    strength: formData.get("strength"),
    weakness: formData.get("weakness"),
    quote: formData.get("quote"),
    intro: formData.get("intro"),
    hashtag: formData.get("hashtag"),
    sortOrder: formData.get("sortOrder") ?? "0",
    isActive: formData.get("isActive") ?? "false",
    photoMediaId: formData.get("photoMediaId"),
  });
}
