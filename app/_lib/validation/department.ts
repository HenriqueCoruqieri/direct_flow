import { z } from "zod"

import { DEPARTMENT_ADMINS_MAX_MEMBERS } from "@/app/_lib/domain/department-admins"
import { personIdSchema } from "@/app/_lib/validation/person"
import {
  registryActiveSchema,
  registryIdSchema,
  registryNameSchema,
} from "@/app/_lib/validation/registry"

export const departmentNameSchema = registryNameSchema(
  "Informe o nome do setor.",
)

export const departmentIdSchema = registryIdSchema("Setor inválido.")

export const createDepartmentSchema = z.object({
  name: departmentNameSchema,
})

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>

const DEPARTMENT_MEMBERS_INVALID_MESSAGE = "Lista de pessoas inválida."

const departmentMemberIdsSchema = z
  .array(personIdSchema, { error: DEPARTMENT_MEMBERS_INVALID_MESSAGE })
  .max(DEPARTMENT_ADMINS_MAX_MEMBERS, {
    error: DEPARTMENT_MEMBERS_INVALID_MESSAGE,
  })
  .refine((ids) => new Set(ids).size === ids.length, {
    error: DEPARTMENT_MEMBERS_INVALID_MESSAGE,
  })

export const departmentAdminsSchema = z
  .object({
    memberIds: departmentMemberIdsSchema,
    adminIds: departmentMemberIdsSchema,
  })
  .refine(
    ({ memberIds, adminIds }) => adminIds.every((id) => memberIds.includes(id)),
    {
      error: "Só pessoas ativas do setor podem ser administradoras.",
      path: ["adminIds"],
    },
  )

export type DepartmentAdminsInput = z.infer<typeof departmentAdminsSchema>

export const renameDepartmentSchema = z.object({
  id: departmentIdSchema,
  name: departmentNameSchema,
  admins: departmentAdminsSchema.optional(),
})

export type RenameDepartmentInput = z.infer<typeof renameDepartmentSchema>

export const setDepartmentActiveSchema = z.object({
  id: departmentIdSchema,
  isActive: registryActiveSchema,
})

export type SetDepartmentActiveInput = z.infer<typeof setDepartmentActiveSchema>
