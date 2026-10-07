import type {
  TicketInvalidAssignee,
  TicketStatus,
  TicketVisibilityFacts,
} from "@/app/_lib/types/ticket"
import type { TicketNotFound } from "@/app/_lib/types/ticket-edit"

export type TicketAssigneeTarget = "queue" | "actor" | "colleague"

export interface TicketAssignmentFacts extends TicketVisibilityFacts {
  status: TicketStatus
  hasPendingTransfer: boolean
}

export type TicketAssignmentActorBlockReason =
  "ACTOR_INACTIVE" | "PASSWORD_CHANGE_REQUIRED"

export type TicketAssignmentStateBlockReason =
  "TICKET_FINISHED" | "AWAITING_APPROVAL" | "STATUS_NOT_ASSIGNABLE"

export type TicketAssumeBlockReason =
  | TicketAssignmentActorBlockReason
  | "OUTSIDE_TICKET_DEPARTMENT"
  | TicketAssignmentStateBlockReason
  | "ALREADY_ASSIGNEE"
  | "ALREADY_TAKEN"

export type TicketSendBlockReason =
  | TicketAssignmentActorBlockReason
  | "NOT_DISPATCHER"
  | TicketAssignmentStateBlockReason

export interface AssumeTicketValues {
  mode: "assume"
  ticketId: number
  actorId: number
  expectedAssigneeId: number | null
}

export interface SendTicketValues {
  mode: "send"
  ticketId: number
  actorId: number
  assigneeId: number
  expectedAssigneeId: number | null
}

export type AssignTicketValues = AssumeTicketValues | SendTicketValues

export interface TicketAssignmentSaved {
  status: "saved"
  ticketId: number
  assigneeName: string
}

export interface TicketNotAssignable {
  status: "not_assignable"
}

export interface TicketAssignmentConflict {
  status: "conflict"
  currentAssigneeId: number | null
  currentAssigneeName: string | null
}

export type AssignTicketOutcome =
  | TicketAssignmentSaved
  | TicketNotFound
  | TicketNotAssignable
  | TicketAssignmentConflict
  | TicketInvalidAssignee

export interface TicketAssignmentSource {
  id: number
  assignedTo: number | null
}

export interface SendTicketFormDefaults {
  ticketId: number
  expectedAssigneeId: number | null
  assigneeId?: number
}
