import {
  formatTicketNumber,
  isNonFinalTicketStatus,
} from "@/app/_lib/domain/ticket"
import { isUsableTicketAssignee } from "@/app/_lib/domain/ticket-assignee"
import type {
  AssigneeOption,
  TicketActorFacts,
  TicketStatus,
  TicketVisibilityFacts,
} from "@/app/_lib/types/ticket"
import type {
  SendTicketFormDefaults,
  TicketAssignmentActorBlockReason,
  TicketAssignmentConflict,
  TicketAssignmentFacts,
  TicketAssignmentSource,
  TicketAssignmentStateBlockReason,
  TicketAssumeBlockReason,
  TicketSendBlockReason,
} from "@/app/_lib/types/ticket-assignment"

const TICKET_STATUS_IS_ASSIGNABLE = {
  aberto: true,
  em_analise: true,
  encaminhado: true,
  aguardando_aprovacao: false,
  em_andamento: true,
  resolvido: false,
  fechado: false,
  cancelado: false,
} as const satisfies Record<TicketStatus, boolean>

export const isAssignableStatus = (status: TicketStatus): boolean =>
  TICKET_STATUS_IS_ASSIGNABLE[status]

export const ASSUME_TICKET_LABEL = "Assumir"

export const ASSUME_TICKET_PENDING_LABEL = "Assumindo…"

export const SEND_TICKET_LABEL = "Enviar"

export const SEND_TICKET_PENDING_LABEL = "Enviando…"

export const SEND_TICKET_DIALOG_DESCRIPTION =
  "Escolha quem do setor do chamado vai cuidar dele."

export const TICKET_NOT_ASSUMABLE_MESSAGE =
  "Não é possível assumir este chamado agora."

export const TICKET_NOT_SENDABLE_MESSAGE =
  "Não é possível enviar este chamado agora."

export const UNAVAILABLE_SEND_TARGET_MESSAGE =
  "Este destinatário não está disponível. Escolha uma pessoa ativa do setor do chamado."

export const isTicketDispatcher = (
  actor: TicketActorFacts,
  departmentId: number,
): boolean =>
  actor.isBoard ||
  (actor.role === "admin" && actor.departmentId === departmentId)

export const isTicketTaken = (ticket: TicketVisibilityFacts): boolean =>
  ticket.assignedTo !== null && ticket.assignedTo !== ticket.createdBy

const actorBlockFor = (
  actor: TicketActorFacts,
): TicketAssignmentActorBlockReason | null => {
  if (!actor.isActive) return "ACTOR_INACTIVE"
  if (actor.mustChangePassword) return "PASSWORD_CHANGE_REQUIRED"
  return null
}

const ticketStateBlockFor = (
  ticket: TicketAssignmentFacts,
): TicketAssignmentStateBlockReason | null => {
  if (!isNonFinalTicketStatus(ticket.status)) return "TICKET_FINISHED"
  if (ticket.hasPendingTransfer) return "AWAITING_APPROVAL"
  if (!isAssignableStatus(ticket.status)) return "STATUS_NOT_ASSIGNABLE"
  return null
}

export const ticketAssumeBlockFor = (
  actor: TicketActorFacts,
  ticket: TicketAssignmentFacts,
): TicketAssumeBlockReason | null => {
  const actorBlock = actorBlockFor(actor)
  if (actorBlock !== null) return actorBlock
  if (!isUsableTicketAssignee(actor, ticket.currentDepartmentId)) {
    return "OUTSIDE_TICKET_DEPARTMENT"
  }
  const stateBlock = ticketStateBlockFor(ticket)
  if (stateBlock !== null) return stateBlock
  if (ticket.assignedTo === actor.userId) return "ALREADY_ASSIGNEE"
  if (isTicketTaken(ticket)) return "ALREADY_TAKEN"
  return null
}

export const canAssumeTicket = (
  actor: TicketActorFacts,
  ticket: TicketAssignmentFacts,
): boolean => ticketAssumeBlockFor(actor, ticket) === null

export const ticketSendBlockFor = (
  actor: TicketActorFacts,
  ticket: TicketAssignmentFacts,
): TicketSendBlockReason | null => {
  const actorBlock = actorBlockFor(actor)
  if (actorBlock !== null) return actorBlock
  if (!isTicketDispatcher(actor, ticket.currentDepartmentId)) {
    return "NOT_DISPATCHER"
  }
  return ticketStateBlockFor(ticket)
}

export const canSendTicket = (
  actor: TicketActorFacts,
  ticket: TicketAssignmentFacts,
): boolean => ticketSendBlockFor(actor, ticket) === null

export const sendTargetOptions = (
  assignees: readonly AssigneeOption[],
  currentAssigneeId: number | null,
): AssigneeOption[] =>
  assignees.filter((assignee) => assignee.id !== currentAssigneeId)

export const buildSendTicketFormDefaults = (
  ticket: TicketAssignmentSource,
): SendTicketFormDefaults => ({
  ticketId: ticket.id,
  expectedAssigneeId: ticket.assignedTo,
})

export const sendTicketDialogTitle = (ticketId: number): string =>
  `Enviar chamado ${formatTicketNumber(ticketId)}`

export const describeCurrentAssignee = (assigneeName: string | null): string =>
  assigneeName === null
    ? "Este chamado ainda não tem destinatário."
    : `Destinatário atual: ${assigneeName}.`

export const describeTicketAssumed = (ticketId: number): string =>
  `Você assumiu o chamado ${formatTicketNumber(ticketId)}.`

export const describeTicketSent = (
  ticketId: number,
  assigneeName: string,
): string =>
  `Chamado ${formatTicketNumber(ticketId)} enviado para ${assigneeName}.`

export const describeTicketAssignmentConflict = (
  conflict: TicketAssignmentConflict,
  actorId: number,
): string => {
  if (conflict.currentAssigneeId === actorId) {
    return "Você já assumiu este chamado."
  }
  if (conflict.currentAssigneeName === null) {
    return "Este chamado ficou sem destinatário. Confira a lista atualizada."
  }
  return `Este chamado já foi assumido por ${conflict.currentAssigneeName}.`
}
