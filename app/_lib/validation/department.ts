import { z } from "zod"

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

export const renameDepartmentSchema = z.object({
  id: departmentIdSchema,
  name: departmentNameSchema,
})

export type RenameDepartmentInput = z.infer<typeof renameDepartmentSchema>

export const setDepartmentActiveSchema = z.object({
  id: departmentIdSchema,
  isActive: registryActiveSchema,
})

export type SetDepartmentActiveInput = z.infer<typeof setDepartmentActiveSchema>
