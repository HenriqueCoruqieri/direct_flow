import { z } from "zod"

import {
  TICKET_COMMENT_MAX_LENGTH,
  TICKET_COMMENT_MIN_LENGTH,
} from "@/app/_lib/domain/ticket-comments"
import { registryIdSchema } from "@/app/_lib/validation/registry"
import { POSTGRES_INTEGER_MAX } from "@/app/_lib/validation/search-params"
import { ticketIdSchema } from "@/app/_lib/validation/ticket"

const INVALID_MESSAGE_MESSAGE = "Comentário inválido."

const messageIdSchema = registryIdSchema(INVALID_MESSAGE_MESSAGE).max(
  POSTGRES_INTEGER_MAX,
  { error: INVALID_MESSAGE_MESSAGE },
)

export const ticketCommentContentSchema = z
  .string({ error: "Escreva o comentário." })
  .trim()
  .min(TICKET_COMMENT_MIN_LENGTH, { error: "Escreva o comentário." })
  .max(TICKET_COMMENT_MAX_LENGTH, {
    error: `O comentário precisa ter no máximo ${TICKET_COMMENT_MAX_LENGTH} caracteres.`,
  })

export const createTicketCommentSchema = z.object({
  ticketId: ticketIdSchema,
  content: ticketCommentContentSchema,
  isPrivate: z.boolean({ error: "Visibilidade do comentário inválida." }),
})

export type CreateTicketCommentInput = z.infer<typeof createTicketCommentSchema>

export const editTicketCommentSchema = z.object({
  ticketId: ticketIdSchema,
  messageId: messageIdSchema,
  content: ticketCommentContentSchema,
})

export type EditTicketCommentInput = z.infer<typeof editTicketCommentSchema>

export const deleteTicketCommentSchema = z.object({
  ticketId: ticketIdSchema,
  messageId: messageIdSchema,
})

export type DeleteTicketCommentInput = z.infer<typeof deleteTicketCommentSchema>
