import { z } from "zod"

import { TICKET_PRIORITIES } from "@/app/_lib/domain/ticket"
import {
  registryActiveSchema,
  registryIdSchema,
  registryNameSchema,
} from "@/app/_lib/validation/registry"

export const tagNameSchema = registryNameSchema("Informe o nome da tag.")

export const tagPrioritySchema = z
  .enum(TICKET_PRIORITIES, { error: "Selecione uma prioridade válida." })
  .nullable()

const tagIdSchema = registryIdSchema("Tag inválida.")

export const createTagSchema = z.object({
  departmentId: registryIdSchema("Selecione o setor."),
  name: tagNameSchema,
  priority: tagPrioritySchema.default(null),
})

export type CreateTagInput = z.infer<typeof createTagSchema>

export type CreateTagFormValues = z.input<typeof createTagSchema>

export const updateTagSchema = z.object({
  id: tagIdSchema,
  name: tagNameSchema,
  priority: tagPrioritySchema,
})

export type UpdateTagInput = z.infer<typeof updateTagSchema>

export const setTagActiveSchema = z.object({
  id: tagIdSchema,
  isActive: registryActiveSchema,
})

export type SetTagActiveInput = z.infer<typeof setTagActiveSchema>
