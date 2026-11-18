import { z } from "zod"

import {
  ticketActionsSchema,
  ticketIdSchema,
} from "@/app/_lib/validation/ticket"

export const saveTicketActionsSchema = z.object({
  ticketId: ticketIdSchema,
  actions: ticketActionsSchema,
})

export type SaveTicketActionsInput = z.infer<typeof saveTicketActionsSchema>
