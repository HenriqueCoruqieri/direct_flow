import { z } from "zod"

import {
  DEPARTMENT_NAME_MAX_LENGTH,
  DEPARTMENT_NAME_MIN_LENGTH,
} from "@/app/_lib/domain/department"

export const departmentNameSchema = z
  .string({ error: "Informe o nome do setor." })
  .trim()
  .min(1, { error: "Informe o nome do setor." })
  .min(DEPARTMENT_NAME_MIN_LENGTH, {
    error: `O nome precisa ter no mínimo ${DEPARTMENT_NAME_MIN_LENGTH} caracteres.`,
  })
  .max(DEPARTMENT_NAME_MAX_LENGTH, {
    error: `O nome precisa ter no máximo ${DEPARTMENT_NAME_MAX_LENGTH} caracteres.`,
  })

const departmentIdField = z
  .number({ error: "Setor inválido." })
  .int({ error: "Setor inválido." })
  .positive({ error: "Setor inválido." })

export const createDepartmentSchema = z.object({
  name: departmentNameSchema,
})

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>

export const renameDepartmentSchema = z.object({
  id: departmentIdField,
  name: departmentNameSchema,
})

export type RenameDepartmentInput = z.infer<typeof renameDepartmentSchema>

export const setDepartmentActiveSchema = z.object({
  id: departmentIdField,
  isActive: z.boolean({ error: "Situação inválida." }),
})

export type SetDepartmentActiveInput = z.infer<typeof setDepartmentActiveSchema>
