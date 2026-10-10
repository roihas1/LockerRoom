import { z } from "zod";
import { he } from "@/config/strings";
import { mediaSlotField } from "./media";
import { activeField, hashtagField, optionalText } from "./player";

export const coachFormSchema = z.object({
  name: z.string().trim().min(1, he.validation.required).max(80, he.validation.tooLong(80)),
  role: optionalText(80),
  nickname: optionalText(40),
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

export function parseCoachForm(formData: FormData) {
  return coachFormSchema.safeParse({
    name: formData.get("name"),
    role: formData.get("role"),
    nickname: formData.get("nickname"),
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
