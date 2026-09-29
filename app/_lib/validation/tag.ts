import { z } from "zod"

import {
  registryActiveSchema,
  registryIdSchema,
  registryNameSchema,
} from "@/app/_lib/validation/registry"

export const tagNameSchema = registryNameSchema("Informe o nome da tag.")

const tagIdSchema = registryIdSchema("Tag inválida.")

export const createTagSchema = z.object({
  departmentId: registryIdSchema("Selecione o setor."),
  name: tagNameSchema,
})

export type CreateTagInput = z.infer<typeof createTagSchema>

export const renameTagSchema = z.object({
  id: tagIdSchema,
  name: tagNameSchema,
})

export type RenameTagInput = z.infer<typeof renameTagSchema>

export const setTagActiveSchema = z.object({
  id: tagIdSchema,
  isActive: registryActiveSchema,
})

export type SetTagActiveInput = z.infer<typeof setTagActiveSchema>
