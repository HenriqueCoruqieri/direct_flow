import {
  formatTicketNumber,
  RESOLVED_TICKET_STATUS,
  TICKET_TYPE_LABELS,
} from "@/app/_lib/domain/ticket"
import {
  assigneeEditHintFor,
  preselectedAssigneeId,
  queueAssigneeLabel,
} from "@/app/_lib/domain/ticket-assignee"
import { isTicketLocked } from "@/app/_lib/domain/ticket-closure"
import type { TagOption } from "@/app/_lib/types/tag"
import type { AssigneeOption, TicketStatus } from "@/app/_lib/types/ticket"
import type {
  EditTicketFormDefaults,
  TicketEditabilityFacts,
  TicketEditBlockReason,
  TicketEditChanges,
  TicketEditDetailFacts,
  TicketEditFormOptions,
  TicketEditorFacts,
  TicketEditSnapshot,
  TicketEditSource,
  TicketEditValues,
} from "@/app/_lib/types/ticket-edit"

const TICKET_STATUS_IS_EDITABLE = {
  aberto: true,
  em_analise: true,
  encaminhado: true,
  recusado: true,
  aguardando_aprovacao: false,
  em_andamento: true,
  resolvido: true,
  fechado: false,
  cancelado: false,
} as const satisfies Record<TicketStatus, boolean>

export const UNAVAILABLE_TAG_HINT =
  "A tag atual não está disponível. Escolha uma tag ativa do seu setor."

const preselectedTagId = (
  tagId: number | null,
  tags: readonly TagOption[],
): number | undefined =>
  tagId !== null && tags.some((tag) => tag.id === tagId) ? tagId : undefined

export const tagEditHintFor = (
  tagId: number | null,
  tags: readonly TagOption[],
): string | undefined =>
  preselectedTagId(tagId, tags) === undefined ? UNAVAILABLE_TAG_HINT : undefined

export const isEditableStatus = (status: TicketStatus): boolean =>
  TICKET_STATUS_IS_EDITABLE[status]

export const canEditSolution = (status: TicketStatus): boolean =>
  status === RESOLVED_TICKET_STATUS

export const ticketEditBlockFor = (
  editor: TicketEditorFacts,
  ticket: TicketEditabilityFacts,
  now: Date,
): TicketEditBlockReason | null => {
  if (!editor.isActive) return "EDITOR_INACTIVE"
  if (editor.mustChangePassword) return "PASSWORD_CHANGE_REQUIRED"
  if (ticket.assignedTo !== editor.userId) return "NOT_ASSIGNEE"
  if (ticket.currentDepartmentId !== editor.departmentId) {
    return "OUTSIDE_EDITOR_DEPARTMENT"
  }
  if (ticket.hasPendingTransfer) return "AWAITING_APPROVAL"
  if (isTicketLocked(ticket.status, ticket.resolvedAt, now)) {
    return "TICKET_FINISHED"
  }
  if (!isEditableStatus(ticket.status)) return "STATUS_NOT_EDITABLE"
  return null
}

export const canEditTicket = (
  editor: TicketEditorFacts,
  ticket: TicketEditabilityFacts,
  now: Date,
): boolean => ticketEditBlockFor(editor, ticket, now) === null

export const canEditTicketDetail = (
  editor: TicketEditorFacts,
  ticket: TicketEditDetailFacts,
  now: Date,
): boolean =>
  canEditTicket(
    editor,
    {
      assignedTo: ticket.assignedTo,
      currentDepartmentId: ticket.currentDepartmentId,
      status: ticket.status,
      resolvedAt: ticket.resolvedAt,
      hasPendingTransfer: ticket.pendingTransfer !== null,
    },
    now,
  )

export const buildTicketEditFormOptions = (
  ticket: TicketEditSource,
  tags: readonly TagOption[],
  assignees: readonly AssigneeOption[],
): TicketEditFormOptions => {
  const includesSolution = canEditSolution(ticket.status)

  const defaults: EditTicketFormDefaults = {
    ticketId: ticket.id,
    title: ticket.title,
    description: ticket.description,
    type: ticket.type,
    tagId: preselectedTagId(ticket.tagId, tags),
    assigneeId: preselectedAssigneeId(ticket.assignedTo, assignees),
    attachments: [],
    removedAttachmentIds: [],
  }

  return {
    defaults: includesSolution
      ? { ...defaults, solution: ticket.solution ?? "" }
      : defaults,
    tags: [...tags],
    tagHint: tagEditHintFor(ticket.tagId, tags),
    assignees: [...assignees],
    assigneeHint: assigneeEditHintFor(ticket.assignedTo, assignees),
    queueLabel: queueAssigneeLabel(ticket.currentDepartmentName),
    includesSolution,
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
  assignee:
    current.assignedTo === next.assigneeId
      ? null
      : { fromAssigneeId: current.assignedTo, toAssigneeId: next.assigneeId },
  solution: next.solution !== undefined && current.solution !== next.solution,
})

export const hasTicketEditChanges = (changes: TicketEditChanges): boolean =>
  changes.title ||
  changes.description ||
  changes.type !== null ||
  changes.tag !== null ||
  changes.assignee !== null ||
  changes.solution

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
    changes.assignee ? "destinatário" : null,
    changes.solution ? "solução" : null,
  ].filter((part): part is string => part !== null)

  return parts.length === 0
    ? "Nenhuma alteração."
    : `Alterou ${joinWithAnd(parts)}.`
}

export const describeTicketEdited = (ticketId: number): string =>
  `Chamado ${formatTicketNumber(ticketId)} atualizado.`
