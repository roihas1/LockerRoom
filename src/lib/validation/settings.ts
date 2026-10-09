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

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, he.validation.invalidColor);

export const teamSettingsSchema = z.object({
  name: z.string().trim().min(1, he.validation.required).max(80, he.validation.tooLong(80)),
  shortName: z.string().trim().min(1, he.validation.required).max(40, he.validation.tooLong(40)),
  description: optionalText(1000),
  primaryColor: color,
  secondaryColor: color,
  logoMediaId: mediaSlotField,
  coverMediaId: mediaSlotField,
});

export const seasonFormSchema = z
  .object({
    name: z.string().trim().min(1, he.validation.required).max(40, he.validation.tooLong(40)),
    slug: z
      .string()
      .trim()
      .min(1, he.validation.required)
      .max(40, he.validation.tooLong(40))
      .regex(/^[a-z0-9-]+$/, he.validation.invalidOption),
    startDate: z.string().min(1, he.validation.required),
    endDate: z.string().min(1, he.validation.required),
    makeActive: z
      .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
      .transform((v) => v === "on" || v === "true")
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({ code: "custom", message: he.validation.endBeforeStart, path: ["endDate"] });
    }
  });

export function parseTeamSettingsForm(formData: FormData) {
  return teamSettingsSchema.safeParse({
    name: formData.get("name"),
    shortName: formData.get("shortName"),
    description: formData.get("description"),
    primaryColor: formData.get("primaryColor"),
    secondaryColor: formData.get("secondaryColor"),
    logoMediaId: formData.get("logoMediaId"),
    coverMediaId: formData.get("coverMediaId"),
  });
}

export function parseSeasonForm(formData: FormData) {
  return seasonFormSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    makeActive: formData.get("makeActive"),
  });
}
