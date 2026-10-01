import { z } from "zod"

import {
  TICKET_DESCRIPTION_MAX_LENGTH,
  TICKET_DESCRIPTION_MIN_LENGTH,
  TICKET_TITLE_MAX_LENGTH,
  TICKET_TITLE_MIN_LENGTH,
  TICKET_TYPES,
} from "@/app/_lib/domain/ticket"
import { registryIdSchema } from "@/app/_lib/validation/registry"

export const ticketTitleSchema = z
  .string({ error: "Informe o título." })
  .trim()
  .min(1, { error: "Informe o título." })
  .min(TICKET_TITLE_MIN_LENGTH, {
    error: `O título precisa ter no mínimo ${TICKET_TITLE_MIN_LENGTH} caracteres.`,
  })
  .max(TICKET_TITLE_MAX_LENGTH, {
    error: `O título precisa ter no máximo ${TICKET_TITLE_MAX_LENGTH} caracteres.`,
  })

export const ticketDescriptionSchema = z
  .string({ error: "Descreva o chamado." })
  .trim()
  .min(1, { error: "Descreva o chamado." })
  .min(TICKET_DESCRIPTION_MIN_LENGTH, {
    error: `A descrição precisa ter no mínimo ${TICKET_DESCRIPTION_MIN_LENGTH} caracteres.`,
  })
  .max(TICKET_DESCRIPTION_MAX_LENGTH, {
    error: `A descrição precisa ter no máximo ${TICKET_DESCRIPTION_MAX_LENGTH} caracteres.`,
  })

export const ticketTypeSchema = z.enum(TICKET_TYPES, {
  error: "Selecione o tipo do chamado.",
})

export const createTicketSchema = z.object({
  title: ticketTitleSchema,
  description: ticketDescriptionSchema,
  type: ticketTypeSchema,
  departmentId: registryIdSchema("Selecione o setor de destino."),
  tagId: registryIdSchema("Selecione a tag."),
})

export type CreateTicketInput = z.infer<typeof createTicketSchema>
