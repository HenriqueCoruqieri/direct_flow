import { z } from "zod"

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
    password: z
      .string({ error: "Informe a nova senha." })
      .min(1, { error: "Informe a nova senha." })
      .min(8, { error: "A senha precisa ter no mínimo 8 caracteres." })
      .max(128, { error: "A senha precisa ter no máximo 128 caracteres." }),
    confirmPassword: z
      .string({ error: "Confirme a nova senha." })
      .min(1, { error: "Confirme a nova senha." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "As senhas não conferem.",
    path: ["confirmPassword"],
  })

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
