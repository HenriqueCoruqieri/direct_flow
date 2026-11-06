import { z } from "zod"

import { ROLES } from "@/app/_lib/domain/user"
import {
  REGISTRY_EMAIL_MAX_LENGTH,
  registryActiveSchema,
  registryEmailSchema,
  registryIdSchema,
  registryNameSchema,
} from "@/app/_lib/validation/registry"

export const PERSON_EMAIL_MAX_LENGTH = REGISTRY_EMAIL_MAX_LENGTH

export const personNameSchema = registryNameSchema("Informe o nome da pessoa.")

export const personEmailSchema = registryEmailSchema

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
