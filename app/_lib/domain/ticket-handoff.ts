import { TICKET_COMMENT_MAX_LENGTH } from "@/app/_lib/domain/ticket-comments"
import type { TicketEditChanges } from "@/app/_lib/types/ticket-edit"

export const HANDOFF_COMMENT_LABEL = "Comentário"

export const HANDOFF_COMMENT_PLACEHOLDER =
  "Explique o motivo da troca e o que quem recebe precisa saber."

export const HANDOFF_COMMENT_DESCRIPTION =
  "O texto vira um comentário público no chamado."

export const HANDOFF_COMMENT_REQUIRED_MESSAGE =
  "Escreva um comentário para quem vai receber o chamado."

export const HANDOFF_COMMENT_TOO_LONG_MESSAGE = `O comentário precisa ter no máximo ${TICKET_COMMENT_MAX_LENGTH} caracteres.`

export const EMPTY_HANDOFF_COMMENT = ""

export const requiresHandoffComment = (changes: TicketEditChanges): boolean =>
  changes.assignee !== null

export const isHandoffAssigneeChange = (
  currentAssigneeId: number | null | undefined,
  nextAssigneeId: number | null | undefined,
): boolean =>
  nextAssigneeId !== undefined && nextAssigneeId !== currentAssigneeId
