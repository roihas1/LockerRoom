import { z } from "zod";
import { he } from "@/config/strings";

export const changePasswordSchema = z
  .object({
    newPassword: z.string().min(8, he.validation.passwordTooShort),
    confirmPassword: z.string().min(1, he.validation.required),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({ code: "custom", message: he.validation.passwordsMismatch, path: ["confirmPassword"] });
    }
  });

export function parseChangePasswordForm(formData: FormData) {
  return changePasswordSchema.safeParse({
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
}

export const addAdminSchema = z.object({
  email: z.string().trim().email(he.validation.invalidEmail),
  tempPassword: z.string().min(8, he.validation.passwordTooShort),
});

export function parseAddAdminForm(formData: FormData) {
  return addAdminSchema.safeParse({
    email: formData.get("email"),
    tempPassword: formData.get("tempPassword"),
  });
}
