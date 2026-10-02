import type {
  TicketPendingTransfer,
  TicketStatus,
  TicketVisibilityFacts,
} from "@/app/_lib/types/ticket"
import type { TicketNotFound } from "@/app/_lib/types/ticket-edit"

export interface TicketResolutionFacts extends TicketVisibilityFacts {
  status: TicketStatus
  hasPendingTransfer: boolean
}

export type TicketResolutionBlockReason =
  | "RESOLVER_INACTIVE"
  | "PASSWORD_CHANGE_REQUIRED"
  | "NOT_RESOLVER"
  | "TICKET_FINISHED"
  | "ALREADY_RESOLVED"
  | "AWAITING_APPROVAL"
  | "STATUS_NOT_RESOLVABLE"

export interface TicketConclusionFacts extends TicketVisibilityFacts {
  status: TicketStatus
  solution: string | null
  resolvedAt: Date | null
  pendingTransfer: TicketPendingTransfer | null
}

export interface TicketConclusionResolvable {
  state: "resolvable"
}

export interface TicketConclusionResolved {
  state: "resolved"
  solution: string | null
  resolvedAt: Date | null
}

export interface TicketConclusionAwaitingTransfer {
  state: "awaiting_transfer"
  message: string
}

export interface TicketConclusionEmpty {
  state: "empty"
}

export type TicketConclusionState =
  | TicketConclusionResolvable
  | TicketConclusionResolved
  | TicketConclusionAwaitingTransfer
  | TicketConclusionEmpty

export interface UpdateTicketResolutionValues {
  ticketId: number
  solution: string
  resolverId: number
}

export interface TicketResolutionSaved {
  status: "saved"
  ticketId: number
}

export interface TicketNotResolvable {
  status: "not_resolvable"
}

export type UpdateTicketResolutionOutcome =
  TicketResolutionSaved | TicketNotFound | TicketNotResolvable

export interface ResolveTicketFormDefaults {
  ticketId: number
  solution: string
}
