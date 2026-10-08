import { z } from "zod"

import { registryIdSchema } from "@/app/_lib/validation/registry"
import { POSTGRES_INTEGER_MAX } from "@/app/_lib/validation/search-params"
import { ticketIdSchema } from "@/app/_lib/validation/ticket"

const SELECT_ASSIGNEE_MESSAGE = "Selecione o destinatário."

const STALE_ASSIGNEE_MESSAGE =
  "Não foi possível conferir o destinatário atual. Recarregue a página."

const assigneeIdSchema = registryIdSchema(SELECT_ASSIGNEE_MESSAGE).max(
  POSTGRES_INTEGER_MAX,
  { error: SELECT_ASSIGNEE_MESSAGE },
)

const expectedAssigneeIdSchema = registryIdSchema(STALE_ASSIGNEE_MESSAGE)
  .max(POSTGRES_INTEGER_MAX, { error: STALE_ASSIGNEE_MESSAGE })
  .nullable()

export const assumeTicketSchema = z.object({
  ticketId: ticketIdSchema,
  expectedAssigneeId: expectedAssigneeIdSchema,
})

export type AssumeTicketInput = z.infer<typeof assumeTicketSchema>

export const sendTicketSchema = z
  .object({
    ticketId: ticketIdSchema,
    assigneeId: assigneeIdSchema,
    expectedAssigneeId: expectedAssigneeIdSchema,
  })
  .refine((data) => data.assigneeId !== data.expectedAssigneeId, {
    error: "Escolha um destinatário diferente do atual.",
    path: ["assigneeId"],
  })

export type SendTicketInput = z.infer<typeof sendTicketSchema>

export const attendTicketSchema = z.object({
  ticketId: ticketIdSchema,
})

export type AttendTicketInput = z.infer<typeof attendTicketSchema>
