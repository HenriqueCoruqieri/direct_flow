import { z } from "zod"

import {
  TICKET_DESCRIPTION_MAX_LENGTH,
  TICKET_DESCRIPTION_MIN_LENGTH,
  TICKET_TITLE_MAX_LENGTH,
  TICKET_TITLE_MIN_LENGTH,
  TICKET_TYPES,
} from "@/app/_lib/domain/ticket"
import {
  TICKET_SOLUTION_MAX_LENGTH,
  TICKET_SOLUTION_MIN_LENGTH,
} from "@/app/_lib/domain/ticket-resolution"
import { registryIdSchema } from "@/app/_lib/validation/registry"
import {
  idSearchParamSchema,
  POSTGRES_INTEGER_MAX,
} from "@/app/_lib/validation/search-params"

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

export const ticketSolutionSchema = z
  .string({ error: "Descreva a solução." })
  .trim()
  .min(1, { error: "Descreva a solução." })
  .min(TICKET_SOLUTION_MIN_LENGTH, {
    error: `A solução precisa ter no mínimo ${TICKET_SOLUTION_MIN_LENGTH} caracteres.`,
  })
  .max(TICKET_SOLUTION_MAX_LENGTH, {
    error: `A solução precisa ter no máximo ${TICKET_SOLUTION_MAX_LENGTH} caracteres.`,
  })

export const createTicketSchema = z.object({
  title: ticketTitleSchema,
  description: ticketDescriptionSchema,
  type: ticketTypeSchema,
  tagId: registryIdSchema("Selecione a tag."),
  assigneeId: registryIdSchema("Selecione o destinatário."),
})

export type CreateTicketInput = z.infer<typeof createTicketSchema>

export const TICKET_ID_MAX = POSTGRES_INTEGER_MAX

const INVALID_TICKET_MESSAGE = "Chamado inválido."

export const ticketIdSchema = registryIdSchema(INVALID_TICKET_MESSAGE).max(
  TICKET_ID_MAX,
  { error: INVALID_TICKET_MESSAGE },
)

export const ticketIdParamSchema = idSearchParamSchema(INVALID_TICKET_MESSAGE)

export const parseTicketIdParam = (value: string): number | null => {
  const result = ticketIdParamSchema.safeParse(value)
  return result.success ? result.data : null
}

export const editTicketSchema = createTicketSchema.extend({
  ticketId: ticketIdSchema,
  solution: ticketSolutionSchema.optional(),
})

export type EditTicketInput = z.infer<typeof editTicketSchema>
