import { z } from "zod";
import { he } from "@/config/strings";

const optionalText = (max: number) =>
  z
    .string()
    .max(max, he.validation.tooLong(max))
    .transform((v) => (v.trim() === "" ? null : v.trim()))
    .nullable()
    .optional();

const postTypes = [
  "announcement",
  "photo",
  "video",
  "funny_moment",
  "quote",
  "highlight",
  "award",
] as const;

export const postFormSchema = z
  .object({
    type: z.enum(postTypes, he.validation.invalidOption),
    title: optionalText(120),
    body: optionalText(3000),
    quotePlayerId: z
      .union([z.literal(""), z.coerce.number().int(he.validation.integer).positive()])
      .transform((v) => (v === "" ? null : v))
      .nullable(),
    gameId: z
      .union([z.literal(""), z.coerce.number().int(he.validation.integer).positive()])
      .transform((v) => (v === "" ? null : v))
      .nullable(),
    awardId: z
      .union([z.literal(""), z.coerce.number().int(he.validation.integer).positive()])
      .transform((v) => (v === "" ? null : v))
      .nullable(),
    isPinned: z
      .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
      .transform((v) => v === "on" || v === "true")
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "quote" && !data.quotePlayerId) {
      ctx.addIssue({ code: "custom", message: he.validation.required, path: ["quotePlayerId"] });
    }
    if (data.type === "award" && !data.awardId) {
      ctx.addIssue({ code: "custom", message: he.validation.required, path: ["awardId"] });
    }
  });

export function parsePostForm(formData: FormData) {
  return postFormSchema.safeParse({
    type: formData.get("type"),
    title: formData.get("title"),
    body: formData.get("body"),
    quotePlayerId: formData.get("quotePlayerId"),
    gameId: formData.get("gameId"),
    awardId: formData.get("awardId"),
    isPinned: formData.get("isPinned") ?? "false",
  });
}
