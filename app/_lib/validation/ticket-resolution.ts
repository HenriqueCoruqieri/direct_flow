import { z } from "zod"

import { uploadedAttachmentsSchema } from "@/app/_lib/validation/attachment"
import {
  ticketIdSchema,
  ticketSolutionSchema,
} from "@/app/_lib/validation/ticket"

export const resolveTicketSchema = z.object({
  ticketId: ticketIdSchema,
  solution: ticketSolutionSchema,
  attachments: uploadedAttachmentsSchema.optional(),
})

export type ResolveTicketInput = z.infer<typeof resolveTicketSchema>
