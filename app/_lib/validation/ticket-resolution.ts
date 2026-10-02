import { z } from "zod"

import {
  TICKET_SOLUTION_MAX_LENGTH,
  TICKET_SOLUTION_MIN_LENGTH,
} from "@/app/_lib/domain/ticket-resolution"
import { ticketIdSchema } from "@/app/_lib/validation/ticket"

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

export const resolveTicketSchema = z.object({
  ticketId: ticketIdSchema,
  solution: ticketSolutionSchema,
})

export type ResolveTicketInput = z.infer<typeof resolveTicketSchema>
