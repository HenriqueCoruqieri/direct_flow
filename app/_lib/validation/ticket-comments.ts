import { z } from "zod"

import {
  TICKET_COMMENT_MAX_LENGTH,
  TICKET_COMMENT_MIN_LENGTH,
} from "@/app/_lib/domain/ticket-comments"
import { ticketIdSchema } from "@/app/_lib/validation/ticket"

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
