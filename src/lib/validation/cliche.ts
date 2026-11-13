import { z } from "zod";
import "@/lib/validation/he";
import { isClicheWeightBucket } from "@/lib/fun/cliches";
import { he } from "@/config/strings";

const CLICHE_TEXT = /^[\u0590-\u05FF\u200e\u200f\s0-9.,!?…"״׳'\-–—:()]+$/u;

function normalizeClicheText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

const clichePhrase = z
  .string()
  .transform(normalizeClicheText)
  .pipe(
    z
      .string()
      .min(2, he.validation.required)
      .max(120, he.validation.tooLarge)
      .refine((v) => CLICHE_TEXT.test(v), he.validation.invalidOption)
      .refine((v) => !/[<>]|https?:\/\/|www\.|@|#|javascript:/i.test(v), he.validation.invalidOption),
  );

export const submitClicheSchema = z.object({
  body: clichePhrase,
  saidBy: clichePhrase,
  weight: z.number().int().refine(isClicheWeightBucket, he.validation.invalidOption),
  deviceId: z.uuid(),
});

export type SubmitClicheInput = z.infer<typeof submitClicheSchema>;
