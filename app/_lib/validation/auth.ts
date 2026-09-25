import { z } from "zod"

import {
  confirmPasswordField,
  newPasswordField,
  PASSWORD_MISMATCH_ERROR,
} from "@/app/_lib/validation/password"

const emailField = z
  .string({ error: "Informe seu e-mail." })
  .trim()
  .min(1, { error: "Informe seu e-mail." })
  .pipe(z.email({ error: "E-mail inválido." }))

export const loginSchema = z.object({
  email: emailField,
  password: z
    .string({ error: "Informe sua senha." })
    .min(1, { error: "Informe sua senha." }),
})

export type LoginInput = z.infer<typeof loginSchema>

export const requestPasswordResetSchema = z.object({
  email: emailField,
})

export type RequestPasswordResetInput = z.infer<
  typeof requestPasswordResetSchema
>

export const resetPasswordSchema = z
  .object({
    password: newPasswordField,
    confirmPassword: confirmPasswordField,
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: PASSWORD_MISMATCH_ERROR,
    path: ["confirmPassword"],
  })

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
