import { z } from "zod";
import { he } from "@/config/strings";

/** Hebrew validation copy for Zod schemas (`src/lib/validation/*`). */
export const zhe = he.validation;

const zodHebrewErrorMap: z.ZodErrorMap = (issue) => {
  switch (issue.code) {
    case "invalid_type":
      if (issue.input === undefined || issue.input === null) {
        return { message: he.validation.required };
      }
      return { message: he.validation.invalidOption };
    case "too_small":
      if (issue.origin === "string" && issue.minimum === 1) return { message: he.validation.required };
      if (issue.origin === "number" && issue.minimum === 0) return { message: he.validation.nonNegative };
      return { message: he.validation.invalidOption };
    case "too_big":
      return { message: he.validation.tooLarge };
    case "invalid_format":
      if ("format" in issue && issue.format === "email") return { message: he.validation.invalidEmail };
      return { message: he.validation.invalidOption };
    default:
      return { message: he.validation.invalidOption };
  }
};

z.config({ customError: zodHebrewErrorMap });
