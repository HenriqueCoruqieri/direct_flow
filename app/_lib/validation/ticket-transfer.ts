import { z } from "zod"

import { TICKET_COMMENT_MAX_LENGTH } from "@/app/_lib/domain/ticket-comments"
import {
  commentTextSchema,
  handoffCommentSchema,
} from "@/app/_lib/validation/comment-text"
import { registryIdSchema } from "@/app/_lib/validation/registry"
import { POSTGRES_INTEGER_MAX } from "@/app/_lib/validation/search-params"
import { ticketIdSchema } from "@/app/_lib/validation/ticket"

const SELECT_TARGET_DEPARTMENT_MESSAGE = "Selecione o setor de destino."

const STALE_DEPARTMENT_MESSAGE =
  "Não foi possível conferir o setor atual do chamado. Recarregue a página."

const toDepartmentIdSchema = registryIdSchema(
  SELECT_TARGET_DEPARTMENT_MESSAGE,
).max(POSTGRES_INTEGER_MAX, { error: SELECT_TARGET_DEPARTMENT_MESSAGE })

const SELECT_TRANSFER_ASSIGNEE_MESSAGE = "Selecione o destinatário."

const transferAssigneeIdSchema = registryIdSchema(
  SELECT_TRANSFER_ASSIGNEE_MESSAGE,
)
  .max(POSTGRES_INTEGER_MAX, { error: SELECT_TRANSFER_ASSIGNEE_MESSAGE })
  .nullable()

const expectedDepartmentIdSchema = registryIdSchema(
  STALE_DEPARTMENT_MESSAGE,
).max(POSTGRES_INTEGER_MAX, { error: STALE_DEPARTMENT_MESSAGE })

export const sendTicketToDepartmentSchema = z
  .object({
    ticketId: ticketIdSchema,
    toDepartmentId: toDepartmentIdSchema,
    assigneeId: transferAssigneeIdSchema,
    expectedDepartmentId: expectedDepartmentIdSchema,
    comment: handoffCommentSchema,
  })
  .refine((data) => data.toDepartmentId !== data.expectedDepartmentId, {
    error: "Escolha um setor diferente do atual.",
    path: ["toDepartmentId"],
  })

export type SendTicketToDepartmentInput = z.infer<
  typeof sendTicketToDepartmentSchema
>

const STALE_TRANSFER_MESSAGE =
  "Não foi possível conferir o envio deste chamado. Recarregue a página."

const transferIdSchema = registryIdSchema(STALE_TRANSFER_MESSAGE).max(
  POSTGRES_INTEGER_MAX,
  { error: STALE_TRANSFER_MESSAGE },
)

export const acceptTicketTransferSchema = z.object({
  ticketId: ticketIdSchema,
  transferId: transferIdSchema,
})

export type AcceptTicketTransferInput = z.infer<
  typeof acceptTicketTransferSchema
>

const DECLINE_REASON_REQUIRED_MESSAGE = "Escreva o motivo da recusa."

export const declineTicketTransferSchema = z.object({
  ticketId: ticketIdSchema,
  transferId: transferIdSchema,
  reason: commentTextSchema({
    required: DECLINE_REASON_REQUIRED_MESSAGE,
    tooLong: `O motivo precisa ter no máximo ${TICKET_COMMENT_MAX_LENGTH} caracteres.`,
  }),
})

export type DeclineTicketTransferInput = z.infer<
  typeof declineTicketTransferSchema
>
