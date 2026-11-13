import { z } from "zod";
import "@/lib/validation/he";
import { isClicheWeightBucket } from "@/lib/fun/cliches";
import { he } from "@/config/strings";

const CLICHE_TEXT = /^[\u0590-\u05FF\u200e\u200f\s0-9.,!?…"״׳'\-–—:()]+$/u;
const SAID_ON_TEXT = /^[\u0590-\u05FF\u200e\u200f\s0-9.\-\/]+$/u;

function normalizeClicheText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function emptyToNull(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
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

const optionalSaidOn = z.preprocess(
  emptyToNull,
  z
    .string()
    .max(40, he.validation.tooLarge)
    .refine((v) => SAID_ON_TEXT.test(v), he.validation.invalidOption)
    .nullable(),
);

const optionalSourceUrl = z.preprocess(
  emptyToNull,
  z
    .string()
    .url(he.validation.invalidOption)
    .max(500, he.validation.tooLarge)
    .refine((v) => /^https:\/\//i.test(v), he.validation.invalidOption)
    .nullable(),
);

export const submitClicheSchema = z.object({
  body: clichePhrase,
  saidBy: clichePhrase,
  weight: z.number().int().refine(isClicheWeightBucket, he.validation.invalidOption),
  deviceId: z.uuid(),
  saidOn: optionalSaidOn,
  sourceUrl: optionalSourceUrl,
});

export type SubmitClicheInput = z.infer<typeof submitClicheSchema>;

export const adminClicheSchema = z.object({
  body: clichePhrase,
  saidBy: clichePhrase,
  weight: z.coerce.number().int().refine(isClicheWeightBucket, he.validation.invalidOption),
  saidOn: optionalSaidOn,
  sourceUrl: optionalSourceUrl,
  verified: z.boolean(),
});

export type AdminClicheInput = z.infer<typeof adminClicheSchema>;
