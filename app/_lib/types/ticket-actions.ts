import type {
  TicketPendingTransfer,
  TicketStatus,
  TicketVisibilityFacts,
} from "@/app/_lib/types/ticket"
import type { TicketNotFound } from "@/app/_lib/types/ticket-edit"

export interface TicketStatusTrailEntry {
  toStatus: TicketStatus | null
}

export interface TicketActionsFacts extends TicketVisibilityFacts {
  status: TicketStatus
  hasPendingTransfer: boolean
}

export type TicketActionsBlockReason =
  | "ACTOR_INACTIVE"
  | "PASSWORD_CHANGE_REQUIRED"
  | "NOT_RESOLVER"
  | "AWAITING_APPROVAL"
  | "STATUS_NOT_IN_PROGRESS"

export interface TicketActionsDetailFacts extends TicketVisibilityFacts {
  id: number
  status: TicketStatus
  actions: string | null
  pendingTransfer: TicketPendingTransfer | null
}

export interface SaveTicketActionsFormDefaults {
  ticketId: number
  actions: string
}

export interface TicketActionsCardEditable {
  state: "editable"
  actions: string | null
  defaults: SaveTicketActionsFormDefaults
}

export interface TicketActionsCardReadOnly {
  state: "read_only"
  actions: string | null
}

export type TicketActionsCardState =
  TicketActionsCardEditable | TicketActionsCardReadOnly

export interface UpdateTicketActionsValues {
  ticketId: number
  actions: string | null
  actorId: number
}

export interface TicketActionsSaved {
  status: "saved"
  ticketId: number
}

export interface TicketActionsNotEditable {
  status: "not_editable"
}

export type UpdateTicketActionsOutcome =
  TicketActionsSaved | TicketNotFound | TicketActionsNotEditable
