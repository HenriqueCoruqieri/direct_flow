import { z } from "zod"

import {
  ticketIdSchema,
  ticketSolutionSchema,
} from "@/app/_lib/validation/ticket"

export const resolveTicketSchema = z.object({
  ticketId: ticketIdSchema,
  solution: ticketSolutionSchema,
})

export type ResolveTicketInput = z.infer<typeof resolveTicketSchema>
