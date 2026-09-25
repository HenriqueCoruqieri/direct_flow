import { z } from "zod"

export const PASSWORD_MISMATCH_ERROR = "As senhas não conferem."

export const newPasswordField = z
  .string({ error: "Informe a nova senha." })
  .min(1, { error: "Informe a nova senha." })
  .min(8, { error: "A senha precisa ter no mínimo 8 caracteres." })
  .max(128, { error: "A senha precisa ter no máximo 128 caracteres." })

export const confirmPasswordField = z
  .string({ error: "Confirme a nova senha." })
  .min(1, { error: "Confirme a nova senha." })

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ error: "Informe a senha atual." })
      .min(1, { error: "Informe a senha atual." }),
    newPassword: newPasswordField,
    confirmPassword: confirmPasswordField,
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    error: PASSWORD_MISMATCH_ERROR,
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    error: "A nova senha precisa ser diferente da atual.",
    path: ["newPassword"],
  })

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
