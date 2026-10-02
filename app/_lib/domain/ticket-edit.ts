import {
  formatTicketNumber,
  isNonFinalTicketStatus,
  TICKET_TYPE_LABELS,
} from "@/app/_lib/domain/ticket"
import type { TagOption } from "@/app/_lib/types/tag"
import type { TicketStatus } from "@/app/_lib/types/ticket"
import type {
  TicketEditabilityFacts,
  TicketEditBlockReason,
  TicketEditButtonFacts,
  TicketEditButtonState,
  TicketEditChanges,
  TicketEditFormOptions,
  TicketEditorFacts,
  TicketEditSnapshot,
  TicketEditSource,
  TicketEditValues,
} from "@/app/_lib/types/ticket-edit"

const TICKET_STATUS_IS_EDITABLE_BY_AUTHOR = {
  aberto: true,
  em_analise: true,
  encaminhado: true,
  aguardando_aprovacao: false,
  em_andamento: true,
  resolvido: true,
  fechado: false,
  cancelado: false,
} as const satisfies Record<TicketStatus, boolean>

export const isAuthorEditableStatus = (status: TicketStatus): boolean =>
  TICKET_STATUS_IS_EDITABLE_BY_AUTHOR[status]

export const ticketEditBlockFor = (
  editor: TicketEditorFacts,
  ticket: TicketEditabilityFacts,
): TicketEditBlockReason | null => {
  if (!editor.isActive) return "EDITOR_INACTIVE"
  if (editor.mustChangePassword) return "PASSWORD_CHANGE_REQUIRED"
  if (ticket.createdBy !== editor.userId) return "NOT_AUTHOR"
  if (ticket.currentDepartmentId !== editor.departmentId) {
    return "OUTSIDE_EDITOR_DEPARTMENT"
  }
  if (!isNonFinalTicketStatus(ticket.status)) return "TICKET_FINISHED"
  if (ticket.hasPendingTransfer) return "AWAITING_APPROVAL"
  if (!isAuthorEditableStatus(ticket.status)) return "STATUS_NOT_EDITABLE"
  return null
}

export const canEditTicket = (
  editor: TicketEditorFacts,
  ticket: TicketEditabilityFacts,
): boolean => ticketEditBlockFor(editor, ticket) === null

export const describeTicketAwaitingApproval = (
  toDepartmentName: string,
): string => `Aguarde a solução ou devolutiva de ${toDepartmentName}`

export const ticketEditButtonStateFor = (
  editor: TicketEditorFacts,
  ticket: TicketEditButtonFacts,
): TicketEditButtonState => {
  const reason = ticketEditBlockFor(editor, {
    createdBy: ticket.createdBy,
    currentDepartmentId: ticket.currentDepartmentId,
    status: ticket.status,
    hasPendingTransfer: ticket.pendingTransfer !== null,
  })

  if (reason === null) return { state: "editable" }
  if (reason === "AWAITING_APPROVAL" && ticket.pendingTransfer !== null) {
    return {
      state: "blocked",
      message: describeTicketAwaitingApproval(
        ticket.pendingTransfer.toDepartmentName,
      ),
    }
  }
  return { state: "hidden" }
}

export const buildTicketEditFormOptions = (
  ticket: TicketEditSource,
  tags: readonly TagOption[],
): TicketEditFormOptions => {
  const tagId =
    ticket.tagId !== null && tags.some((tag) => tag.id === ticket.tagId)
      ? ticket.tagId
      : undefined

  return {
    defaults: {
      ticketId: ticket.id,
      title: ticket.title,
      description: ticket.description,
      type: ticket.type,
      tagId,
    },
    tags: [...tags],
  }
}

export const diffTicketEdit = (
  current: TicketEditSnapshot,
  next: TicketEditValues,
): TicketEditChanges => ({
  title: current.title !== next.title,
  description: current.description !== next.description,
  type:
    current.type === next.type ? null : { from: current.type, to: next.type },
  tag:
    current.tagId === next.tagId
      ? null
      : { fromTagId: current.tagId, toTagId: next.tagId },
})

export const hasTicketEditChanges = (changes: TicketEditChanges): boolean =>
  changes.title ||
  changes.description ||
  changes.type !== null ||
  changes.tag !== null

const joinWithAnd = (items: readonly string[]): string =>
  items.length < 2
    ? items.join("")
    : `${items.slice(0, -1).join(", ")} e ${items.slice(-1).join("")}`

export const describeTicketEditNote = (changes: TicketEditChanges): string => {
  const parts = [
    changes.title ? "título" : null,
    changes.description ? "descrição" : null,
    changes.type
      ? `tipo (${TICKET_TYPE_LABELS[changes.type.from]} → ${TICKET_TYPE_LABELS[changes.type.to]})`
      : null,
    changes.tag ? "tag" : null,
  ].filter((part): part is string => part !== null)

  return parts.length === 0
    ? "Nenhuma alteração."
    : `Alterou ${joinWithAnd(parts)}.`
}

export const describeTicketEdited = (ticketId: number): string =>
  `Chamado ${formatTicketNumber(ticketId)} atualizado.`
