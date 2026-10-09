import {
  assignableDepartments,
  isAssignableDepartment,
} from "@/app/_lib/domain/department"
import {
  AWAITING_APPROVAL_TICKET_STATUS,
  canViewTicket,
  formatTicketNumber,
  isNonFinalTicketStatus,
  TICKET_STATUS_LABELS,
} from "@/app/_lib/domain/ticket"
import {
  isTicketDispatcher,
  ticketActorBlockFor,
} from "@/app/_lib/domain/ticket-assignment"
import type { DepartmentOption } from "@/app/_lib/types/department"
import type {
  TicketActorFacts,
  TicketStatus,
  TicketViewerFacts,
  TicketVisibilityFacts,
} from "@/app/_lib/types/ticket"
import type { TicketAssignmentFacts } from "@/app/_lib/types/ticket-assignment"
import type {
  SendToDepartmentFormDefaults,
  TicketDepartmentSendBlockReason,
  TicketDepartmentSendDetailFacts,
  TicketDepartmentSendStateBlockReason,
  TicketTransferConflict,
  TicketTransferSource,
  TransferTargetFacts,
} from "@/app/_lib/types/ticket-transfer"

const TICKET_STATUS_IS_DEPARTMENT_SENDABLE = {
  aberto: true,
  em_analise: false,
  encaminhado: true,
  aguardando_aprovacao: false,
  em_andamento: true,
  resolvido: false,
  fechado: false,
  cancelado: false,
} as const satisfies Record<TicketStatus, boolean>

export const isDepartmentSendableStatus = (status: TicketStatus): boolean =>
  TICKET_STATUS_IS_DEPARTMENT_SENDABLE[status]

export const TRANSFER_REQUESTED_TICKET_STATUS = AWAITING_APPROVAL_TICKET_STATUS

export const SEND_TO_DEPARTMENT_LABEL = "Enviar para outro setor"

export const SEND_TO_DEPARTMENT_SUBMIT_LABEL = "Enviar"

export const SEND_TO_DEPARTMENT_PENDING_LABEL = "Enviando…"

export const SEND_TO_DEPARTMENT_DIALOG_DESCRIPTION =
  "O chamado sai da fila deste setor e vai para a fila do setor escolhido, aguardando aprovação até alguém de lá atendê-lo."

export const TRANSFER_TARGET_LABEL = "Setor de destino"

export const TRANSFER_TARGET_PLACEHOLDER = "Selecione o setor"

export const NO_TRANSFER_TARGETS_MESSAGE =
  "Não há outro setor ativo para receber este chamado."

export const TICKET_NOT_SENDABLE_TO_DEPARTMENT_MESSAGE =
  "Não é possível enviar este chamado para outro setor agora."

export const UNAVAILABLE_TRANSFER_TARGET_MESSAGE =
  "Este setor não está disponível. Escolha outro setor ativo."

const TICKET_DEPARTMENT_SEND_BLOCK_IS_CONFLICT = {
  ACTOR_INACTIVE: false,
  PASSWORD_CHANGE_REQUIRED: false,
  NOT_SENDER: true,
  TICKET_FINISHED: true,
  AWAITING_APPROVAL: true,
  STATUS_NOT_SENDABLE: true,
} as const satisfies Record<TicketDepartmentSendBlockReason, boolean>

export const isTicketDepartmentSender = (
  actor: TicketActorFacts,
  ticket: TicketVisibilityFacts,
): boolean =>
  isTicketDispatcher(actor, ticket.currentDepartmentId) ||
  ticket.assignedTo === actor.userId

export const ticketDepartmentSendBlockFor = (
  actor: TicketActorFacts,
  ticket: TicketAssignmentFacts,
): TicketDepartmentSendBlockReason | null => {
  const actorBlock = ticketActorBlockFor(actor)
  if (actorBlock !== null) return actorBlock
  if (!isTicketDepartmentSender(actor, ticket)) return "NOT_SENDER"
  if (!isNonFinalTicketStatus(ticket.status)) return "TICKET_FINISHED"
  if (ticket.hasPendingTransfer) return "AWAITING_APPROVAL"
  if (!isDepartmentSendableStatus(ticket.status)) return "STATUS_NOT_SENDABLE"
  return null
}

export const canSendTicketToDepartment = (
  actor: TicketActorFacts,
  ticket: TicketAssignmentFacts,
): boolean => ticketDepartmentSendBlockFor(actor, ticket) === null

export const canSendTicketToDepartmentDetail = (
  actor: TicketActorFacts,
  ticket: TicketDepartmentSendDetailFacts,
): boolean =>
  canSendTicketToDepartment(actor, {
    createdBy: ticket.createdBy,
    assignedTo: ticket.assignedTo,
    currentDepartmentId: ticket.currentDepartmentId,
    status: ticket.status,
    hasPendingTransfer: ticket.pendingTransfer !== null,
  })

export const isTicketDepartmentSendConflict = (
  reason: TicketDepartmentSendBlockReason,
): reason is TicketDepartmentSendStateBlockReason =>
  TICKET_DEPARTMENT_SEND_BLOCK_IS_CONFLICT[reason]

export const isUsableTransferTarget = (
  target: TransferTargetFacts,
  currentDepartmentId: number,
): boolean =>
  isAssignableDepartment(target) && target.id !== currentDepartmentId

export const transferTargetOptions = (
  options: readonly DepartmentOption[],
  currentDepartmentId: number,
): DepartmentOption[] =>
  assignableDepartments(options).filter(
    (option) => option.id !== currentDepartmentId,
  )

export const canViewTicketAfterTransfer = (
  viewer: TicketViewerFacts,
  ticket: TicketVisibilityFacts,
  toDepartmentId: number,
): boolean =>
  canViewTicket(viewer, {
    createdBy: ticket.createdBy,
    assignedTo: null,
    currentDepartmentId: toDepartmentId,
  })

export const buildSendToDepartmentFormDefaults = (
  ticket: TicketTransferSource,
): SendToDepartmentFormDefaults => ({
  ticketId: ticket.id,
  expectedDepartmentId: ticket.currentDepartmentId,
})

export const sendToDepartmentDialogTitle = (ticketId: number): string =>
  `Enviar chamado ${formatTicketNumber(ticketId)} para outro setor`

export const describeTicketSentToDepartment = (
  ticketId: number,
  departmentName: string,
): string =>
  `Chamado ${formatTicketNumber(ticketId)} enviado para a fila de ${departmentName}.`

export const describeTicketTransferConflict = (
  conflict: TicketTransferConflict,
): string => {
  if (conflict.pendingTransferDepartmentName !== null) {
    return `Este chamado já foi enviado para ${conflict.pendingTransferDepartmentName} e aguarda aprovação.`
  }
  if (!isDepartmentSendableStatus(conflict.currentStatus)) {
    return `O status deste chamado mudou para ${TICKET_STATUS_LABELS[conflict.currentStatus]}.`
  }
  if (conflict.reason === "DEPARTMENT_CHANGED") {
    return `Este chamado agora está no setor ${conflict.currentDepartmentName}. Confira a página atualizada.`
  }
  return "Você não pode mais enviar este chamado para outro setor. Confira a página atualizada."
}
