import { z } from "zod"

export const loginSchema = z.object({
  email: z
    .string({ error: "Informe seu e-mail." })
    .trim()
    .min(1, { error: "Informe seu e-mail." })
    .pipe(z.email({ error: "E-mail inválido." })),
  password: z
    .string({ error: "Informe sua senha." })
    .min(1, { error: "Informe sua senha." }),
})

export type LoginInput = z.infer<typeof loginSchema>
