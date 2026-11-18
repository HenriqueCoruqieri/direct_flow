import {
  formatTicketNumber,
  RESOLVED_TICKET_STATUS,
} from "@/app/_lib/domain/ticket"
import {
  isTicketResolver,
  TICKET_SOLUTION_MAX_LENGTH,
} from "@/app/_lib/domain/ticket-resolution"
import type { TicketActorFacts, TicketStatus } from "@/app/_lib/types/ticket"
import type {
  SaveTicketActionsFormDefaults,
  TicketActionsBlockReason,
  TicketActionsCardState,
  TicketActionsDetailFacts,
  TicketActionsFacts,
  TicketStatusTrailEntry,
} from "@/app/_lib/types/ticket-actions"

export const TICKET_ACTIONS_MAX_LENGTH = TICKET_SOLUTION_MAX_LENGTH

export const TICKET_ACTIONS_WRITABLE_STATUS =
  "em_andamento" as const satisfies TicketStatus

export const TICKET_ACTIONS_TITLE = "Ações"

export const NO_TICKET_ACTIONS_LABEL = "Nenhuma ação registrada."

export const TICKET_ACTIONS_PLACEHOLDER =
  "Descreva o que foi feito até chegar à solução."

export const SAVE_TICKET_ACTIONS_LABEL = "Salvar"

export const SAVE_TICKET_ACTIONS_PENDING_LABEL = "Salvando…"

export const TICKET_ACTIONS_FORBIDDEN_MESSAGE =
  "Você não tem permissão para registrar as ações deste chamado."

export const TICKET_ACTIONS_NOT_EDITABLE_MESSAGE =
  "As ações só podem ser registradas com o chamado em andamento."

export const TICKET_ACTIONS_UNEXPECTED_ERROR_MESSAGE =
  "Não foi possível salvar as ações agora. Tente novamente."

export const TICKET_ACTIONS_MAX_LENGTH_MESSAGE = `As ações precisam ter no máximo ${TICKET_ACTIONS_MAX_LENGTH} caracteres.`

export const normalizeTicketActions = (value: string): string | null => {
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

export const ticketActionsChanged = (
  current: string | null,
  next: string | undefined,
): boolean => next !== undefined && current !== normalizeTicketActions(next)

export const ticketActionsDisplayText = (actions: string | null): string =>
  actions ?? NO_TICKET_ACTIONS_LABEL

export const hasTicketBeenInProgress = (
  trail: readonly TicketStatusTrailEntry[],
): boolean =>
  trail.some((entry) => entry.toStatus === TICKET_ACTIONS_WRITABLE_STATUS)

export const canEditTicketActionsInEdit = (
  status: TicketStatus,
  hasBeenInProgress: boolean,
): boolean => {
  if (status === TICKET_ACTIONS_WRITABLE_STATUS) return true
  return status === RESOLVED_TICKET_STATUS && hasBeenInProgress
}

export const ticketActionsBlockFor = (
  actor: TicketActorFacts,
  ticket: TicketActionsFacts,
): TicketActionsBlockReason | null => {
  if (!actor.isActive) return "ACTOR_INACTIVE"
  if (actor.mustChangePassword) return "PASSWORD_CHANGE_REQUIRED"
  if (!isTicketResolver(actor, ticket)) return "NOT_RESOLVER"
  if (ticket.hasPendingTransfer) return "AWAITING_APPROVAL"
  if (ticket.status !== TICKET_ACTIONS_WRITABLE_STATUS) {
    return "STATUS_NOT_IN_PROGRESS"
  }
  return null
}

export const canSaveTicketActions = (
  actor: TicketActorFacts,
  ticket: TicketActionsFacts,
): boolean => ticketActionsBlockFor(actor, ticket) === null

export const buildSaveTicketActionsFormDefaults = (
  ticketId: number,
  actions: string | null,
): SaveTicketActionsFormDefaults => ({ ticketId, actions: actions ?? "" })

export const ticketActionsCardStateFor = (
  viewer: TicketActorFacts,
  ticket: TicketActionsDetailFacts,
): TicketActionsCardState => {
  const editable = canSaveTicketActions(viewer, {
    createdBy: ticket.createdBy,
    assignedTo: ticket.assignedTo,
    currentDepartmentId: ticket.currentDepartmentId,
    status: ticket.status,
    hasPendingTransfer: ticket.pendingTransfer !== null,
  })

  if (!editable) return { state: "read_only", actions: ticket.actions }

  return {
    state: "editable",
    actions: ticket.actions,
    defaults: buildSaveTicketActionsFormDefaults(ticket.id, ticket.actions),
  }
}

export const describeTicketActionsSaved = (ticketId: number): string =>
  `Ações do chamado ${formatTicketNumber(ticketId)} salvas.`
