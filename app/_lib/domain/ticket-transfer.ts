import { APPROVALS_LABEL } from "@/app/_lib/domain/approvals"
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
import { isUsableTicketAssignee } from "@/app/_lib/domain/ticket-assignee"
import {
  ATTENDED_TICKET_STATUS,
  canAttendTicket,
  isTicketDispatcher,
  ticketActorBlockFor,
} from "@/app/_lib/domain/ticket-assignment"
import { EMPTY_HANDOFF_COMMENT } from "@/app/_lib/domain/ticket-handoff"
import type { DepartmentOption } from "@/app/_lib/types/department"
import type {
  TicketActorFacts,
  TicketAssigneeFacts,
  TicketStatus,
  TicketViewerFacts,
  TicketVisibilityFacts,
} from "@/app/_lib/types/ticket"
import type { TicketAssignmentFacts } from "@/app/_lib/types/ticket-assignment"
import type {
  AcceptTicketTransferTarget,
  ApprovalStatus,
  DeclineTicketTransferFormDefaults,
  DeclineTicketTransferSource,
  DeclineTicketTransferTarget,
  SendToDepartmentFormDefaults,
  TicketAttendKind,
  TicketAttendTarget,
  TicketDeclineReturnFacts,
  TicketDepartmentSendBlockReason,
  TicketDepartmentSendDetailFacts,
  TicketDepartmentSendStateBlockReason,
  TicketReviewedTransferFacts,
  TicketTransferConflict,
  TicketTransferDeclineBlockReason,
  TicketTransferReviewBlockReason,
  TicketTransferReviewConflict,
  TicketTransferReviewConflictReason,
  TicketTransferReviewFacts,
  TicketTransferReviewSource,
  TicketTransferReviewStateBlockReason,
  TicketTransferSource,
  TransferTargetFacts,
} from "@/app/_lib/types/ticket-transfer"

const TICKET_STATUS_IS_DEPARTMENT_SENDABLE = {
  aberto: true,
  em_analise: false,
  encaminhado: true,
  recusado: true,
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

export const SEND_TO_DEPARTMENT_DIALOG_DESCRIPTION = `O chamado sai da fila deste setor e vai para a lista de ${APPROVALS_LABEL} do setor escolhido, aguardando aprovação até alguém de lá atendê-lo. O comentário fica público no chamado e aparece no aviso de aprovação.`

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
  comment: EMPTY_HANDOFF_COMMENT,
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

const TICKET_TRANSFER_REVIEW_BLOCK_IS_CONFLICT = {
  ACTOR_INACTIVE: false,
  PASSWORD_CHANGE_REQUIRED: false,
  NO_PENDING_TRANSFER: true,
  OUTSIDE_TARGET_DEPARTMENT: false,
  STATUS_NOT_AWAITING: true,
} as const satisfies Record<TicketTransferReviewBlockReason, boolean>

export const ticketTransferReviewBlockFor = (
  actor: TicketActorFacts,
  ticket: TicketTransferReviewFacts,
): TicketTransferReviewBlockReason | null => {
  const actorBlock = ticketActorBlockFor(actor)
  if (actorBlock !== null) return actorBlock
  const pending = ticket.pendingTransfer
  if (pending === null) return "NO_PENDING_TRANSFER"
  if (
    actor.departmentId !== pending.toDepartmentId ||
    actor.departmentId !== ticket.currentDepartmentId
  ) {
    return "OUTSIDE_TARGET_DEPARTMENT"
  }
  if (ticket.status !== AWAITING_APPROVAL_TICKET_STATUS) {
    return "STATUS_NOT_AWAITING"
  }
  return null
}

export const canAcceptTicketTransfer = (
  actor: TicketActorFacts,
  ticket: TicketTransferReviewFacts,
): boolean => ticketTransferReviewBlockFor(actor, ticket) === null

export const isTicketTransferReviewConflict = (
  reason: TicketTransferReviewBlockReason,
): reason is TicketTransferReviewStateBlockReason =>
  TICKET_TRANSFER_REVIEW_BLOCK_IS_CONFLICT[reason]

export const REJECTED_TRANSFER_STATUS =
  "rejeitado" as const satisfies ApprovalStatus

export const canFollowTicketTransferReview = (
  viewer: TicketViewerFacts,
  ticket: TicketVisibilityFacts,
  reviewedTransfer: TicketReviewedTransferFacts | null,
): boolean =>
  canViewTicket(viewer, ticket) ||
  (reviewedTransfer !== null &&
    reviewedTransfer.status === REJECTED_TRANSFER_STATUS &&
    reviewedTransfer.toDepartmentId === viewer.departmentId)

export const ticketTransferReviewConflictReasonFor = (
  stateBlock: TicketTransferReviewStateBlockReason,
  reviewedTransfer: TicketReviewedTransferFacts | null,
): TicketTransferReviewConflictReason =>
  stateBlock === "NO_PENDING_TRANSFER" &&
  reviewedTransfer?.status === REJECTED_TRANSFER_STATUS
    ? "TRANSFER_DECLINED"
    : stateBlock

export const ticketAttendKindFor = (
  actor: TicketActorFacts,
  ticket: TicketTransferReviewFacts,
): TicketAttendKind | null => {
  if (canAcceptTicketTransfer(actor, ticket)) return "accept_transfer"
  const canStartWork = canAttendTicket(actor, {
    createdBy: ticket.createdBy,
    assignedTo: ticket.assignedTo,
    currentDepartmentId: ticket.currentDepartmentId,
    status: ticket.status,
    hasPendingTransfer: ticket.pendingTransfer !== null,
  })
  return canStartWork ? "start_work" : null
}

export const buildAcceptTicketTransferTarget = (
  ticket: TicketTransferReviewSource,
): AcceptTicketTransferTarget | null =>
  ticket.pendingTransfer === null
    ? null
    : { ticketId: ticket.id, transferId: ticket.pendingTransfer.id }

export const ticketAttendTargetFor = (
  actor: TicketActorFacts,
  ticket: TicketTransferReviewSource,
): TicketAttendTarget | null => {
  const kind = ticketAttendKindFor(actor, ticket)
  if (kind === "start_work") return { kind, ticketId: ticket.id }
  if (kind === null) return null
  const target = buildAcceptTicketTransferTarget(ticket)
  return target === null ? null : { kind, ...target }
}

export const describeTicketTransferReviewConflict = (
  conflict: TicketTransferReviewConflict,
  actorId: number,
): string => {
  if (conflict.currentAssigneeId === actorId) {
    return conflict.currentStatus === ATTENDED_TICKET_STATUS
      ? "Você já está atendendo este chamado."
      : "Este chamado já está com você. Confira a página atualizada."
  }
  if (conflict.reason === "TRANSFER_CHANGED") {
    return "O envio deste chamado mudou. Confira a página atualizada."
  }
  if (conflict.reason === "TRANSFER_DECLINED") {
    return "Este chamado já foi recusado e devolvido ao setor que o enviou."
  }
  if (conflict.currentAssigneeName !== null) {
    return `Este chamado já foi aceito e agora está com ${conflict.currentAssigneeName}.`
  }
  return "Este chamado não aguarda mais aprovação. Confira a página atualizada."
}

export const DECLINE_TRANSFER_LABEL = "Recusar"

export const DECLINE_TRANSFER_PENDING_LABEL = "Recusando…"

export const DECLINE_REASON_LABEL = "Motivo da recusa"

export const DECLINE_REASON_PLACEHOLDER =
  "Explique por que este setor não vai atender o chamado."

export const TICKET_NOT_DECLINABLE_MESSAGE =
  "Não é possível recusar este chamado agora."

export const ticketTransferDeclineBlockFor = (
  actor: TicketActorFacts,
  ticket: TicketTransferReviewFacts,
): TicketTransferDeclineBlockReason | null =>
  ticketTransferReviewBlockFor(actor, ticket)

export const canDeclineTicketTransfer = (
  actor: TicketActorFacts,
  ticket: TicketTransferReviewFacts,
): boolean => ticketTransferDeclineBlockFor(actor, ticket) === null

export const ticketDeclineTargetFor = (
  actor: TicketActorFacts,
  ticket: DeclineTicketTransferSource,
): DeclineTicketTransferTarget | null => {
  const pending = ticket.pendingTransfer
  if (pending === null || !canDeclineTicketTransfer(actor, ticket)) return null
  return {
    ticketId: ticket.id,
    transferId: pending.id,
    fromDepartmentName: pending.fromDepartmentName,
  }
}

export const buildDeclineTicketTransferFormDefaults = (
  target: AcceptTicketTransferTarget,
): DeclineTicketTransferFormDefaults => ({
  ticketId: target.ticketId,
  transferId: target.transferId,
  reason: "",
})

export const declineReturnAssigneeFor = (
  transfer: TicketDeclineReturnFacts,
  requester: TicketAssigneeFacts | null,
): number | null =>
  requester !== null &&
  isUsableTicketAssignee(requester, transfer.fromDepartmentId)
    ? transfer.requestedBy
    : null

export const canViewTicketAfterDecline = (
  viewer: TicketViewerFacts,
  ticket: TicketVisibilityFacts,
  transfer: TicketDeclineReturnFacts,
  returnAssigneeId: number | null,
): boolean =>
  canViewTicket(viewer, {
    createdBy: ticket.createdBy,
    assignedTo: returnAssigneeId,
    currentDepartmentId: transfer.fromDepartmentId,
  })

export const declineTicketTransferDialogTitle = (ticketId: number): string =>
  `Recusar chamado ${formatTicketNumber(ticketId)}`

export const describeDeclineDestination = (
  fromDepartmentName: string,
): string =>
  `O motivo vira um comentário público e o chamado volta para ${fromDepartmentName}.`

export const describeTicketTransferDeclined = (
  ticketId: number,
  departmentName: string,
): string =>
  `Chamado ${formatTicketNumber(ticketId)} recusado e devolvido para ${departmentName}.`
