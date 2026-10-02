import {
  describePendingTransfer,
  formatTicketNumber,
  isNonFinalTicketStatus,
  TICKET_DESCRIPTION_MAX_LENGTH,
  TICKET_DESCRIPTION_MIN_LENGTH,
} from "@/app/_lib/domain/ticket"
import type {
  TicketActorFacts,
  TicketPendingTransfer,
  TicketStatus,
  TicketVisibilityFacts,
} from "@/app/_lib/types/ticket"
import type {
  ResolveTicketFormDefaults,
  TicketConclusionFacts,
  TicketConclusionState,
  TicketResolutionBlockReason,
  TicketResolutionFacts,
} from "@/app/_lib/types/ticket-resolution"

export const RESOLVED_TICKET_STATUS: TicketStatus = "resolvido"

export const TICKET_SOLUTION_MIN_LENGTH = TICKET_DESCRIPTION_MIN_LENGTH

export const TICKET_SOLUTION_MAX_LENGTH = TICKET_DESCRIPTION_MAX_LENGTH

export const NO_SOLUTION_LABEL = "Nenhuma solução registrada."

export const TICKET_ATTACHMENTS_SOON_MESSAGE =
  "Anexos estarão disponíveis em breve."

export const TICKET_TRANSFER_SOON_MESSAGE =
  "O envio para outro setor estará disponível em breve."

const TICKET_STATUS_IS_RESOLVABLE = {
  aberto: true,
  em_analise: true,
  encaminhado: true,
  aguardando_aprovacao: false,
  em_andamento: true,
  resolvido: false,
  fechado: false,
  cancelado: false,
} as const satisfies Record<TicketStatus, boolean>

export const isResolvableStatus = (status: TicketStatus): boolean =>
  TICKET_STATUS_IS_RESOLVABLE[status]

const TICKET_STATUS_SHOWS_SOLUTION = {
  aberto: false,
  em_analise: false,
  encaminhado: false,
  aguardando_aprovacao: false,
  em_andamento: false,
  resolvido: true,
  fechado: true,
  cancelado: false,
} as const satisfies Record<TicketStatus, boolean>

export const showsTicketSolution = (status: TicketStatus): boolean =>
  TICKET_STATUS_SHOWS_SOLUTION[status]

export const isTicketResolver = (
  resolver: TicketActorFacts,
  ticket: TicketVisibilityFacts,
): boolean => {
  if (resolver.isBoard) return true
  if (
    resolver.role === "admin" &&
    resolver.departmentId === ticket.currentDepartmentId
  ) {
    return true
  }
  if (ticket.assignedTo !== null) return ticket.assignedTo === resolver.userId
  return (
    ticket.createdBy === resolver.userId &&
    ticket.currentDepartmentId === resolver.departmentId
  )
}

export const ticketResolutionBlockFor = (
  resolver: TicketActorFacts,
  ticket: TicketResolutionFacts,
): TicketResolutionBlockReason | null => {
  if (!resolver.isActive) return "RESOLVER_INACTIVE"
  if (resolver.mustChangePassword) return "PASSWORD_CHANGE_REQUIRED"
  if (!isTicketResolver(resolver, ticket)) return "NOT_RESOLVER"
  if (!isNonFinalTicketStatus(ticket.status)) return "TICKET_FINISHED"
  if (ticket.status === RESOLVED_TICKET_STATUS) return "ALREADY_RESOLVED"
  if (ticket.hasPendingTransfer) return "AWAITING_APPROVAL"
  if (!isResolvableStatus(ticket.status)) return "STATUS_NOT_RESOLVABLE"
  return null
}

export const canResolveTicket = (
  resolver: TicketActorFacts,
  ticket: TicketResolutionFacts,
): boolean => ticketResolutionBlockFor(resolver, ticket) === null

export const describeTransferAwaitingConclusion = (
  transfer: TicketPendingTransfer,
): string => {
  const reason = transfer.requestReason?.trim() ?? ""
  return reason.length > 0 ? reason : describePendingTransfer(transfer)
}

export const ticketConclusionStateFor = (
  viewer: TicketActorFacts,
  ticket: TicketConclusionFacts,
): TicketConclusionState => {
  if (showsTicketSolution(ticket.status)) {
    return {
      state: "resolved",
      solution: ticket.solution,
      resolvedAt: ticket.resolvedAt,
    }
  }
  if (!isNonFinalTicketStatus(ticket.status)) return { state: "empty" }
  if (ticket.pendingTransfer !== null) {
    return {
      state: "awaiting_transfer",
      message: describeTransferAwaitingConclusion(ticket.pendingTransfer),
    }
  }
  if (
    canResolveTicket(viewer, {
      createdBy: ticket.createdBy,
      assignedTo: ticket.assignedTo,
      currentDepartmentId: ticket.currentDepartmentId,
      status: ticket.status,
      hasPendingTransfer: false,
    })
  ) {
    return { state: "resolvable" }
  }
  return { state: "empty" }
}

export const buildResolveTicketFormDefaults = (
  ticketId: number,
): ResolveTicketFormDefaults => ({ ticketId, solution: "" })

export const describeTicketResolved = (ticketId: number): string =>
  `Chamado ${formatTicketNumber(ticketId)} resolvido.`
