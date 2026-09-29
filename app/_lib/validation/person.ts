import { z } from "zod"

import { ROLES } from "@/app/_lib/domain/user"
import {
  registryActiveSchema,
  registryIdSchema,
  registryNameSchema,
} from "@/app/_lib/validation/registry"

export const PERSON_EMAIL_MAX_LENGTH = 254

export const personNameSchema = registryNameSchema("Informe o nome da pessoa.")

export const personEmailSchema = z
  .string({ error: "Informe o e-mail." })
  .trim()
  .toLowerCase()
  .min(1, { error: "Informe o e-mail." })
  .max(PERSON_EMAIL_MAX_LENGTH, {
    error: `O e-mail precisa ter no máximo ${PERSON_EMAIL_MAX_LENGTH} caracteres.`,
  })
  .pipe(z.email({ error: "E-mail inválido." }))

export const personRoleSchema = z.enum(ROLES, { error: "Papel inválido." })

const personIdSchema = registryIdSchema("Pessoa inválida.")

const personDepartmentIdSchema = registryIdSchema("Selecione o setor.")

export const createPersonSchema = z.object({
  name: personNameSchema,
  email: personEmailSchema,
  departmentId: personDepartmentIdSchema,
  role: personRoleSchema.optional(),
})

export type CreatePersonInput = z.infer<typeof createPersonSchema>

export const updatePersonSchema = z.object({
  id: personIdSchema,
  name: personNameSchema,
  email: personEmailSchema,
  departmentId: personDepartmentIdSchema,
  role: personRoleSchema.optional(),
})

export type UpdatePersonInput = z.infer<typeof updatePersonSchema>

export const setPersonActiveSchema = z.object({
  id: personIdSchema,
  isActive: registryActiveSchema,
})

export type SetPersonActiveInput = z.infer<typeof setPersonActiveSchema>

export const restorePersonPasswordSchema = z.object({
  id: personIdSchema,
})

export type RestorePersonPasswordInput = z.infer<
  typeof restorePersonPasswordSchema
>
