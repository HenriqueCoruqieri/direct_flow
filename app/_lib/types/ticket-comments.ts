import type {
  TicketStatus,
  TicketVisibilityFacts,
} from "@/app/_lib/types/ticket"
import type { TicketNotFound } from "@/app/_lib/types/ticket-edit"
import type { MessageVisibility } from "@/db/schema"

export type { MessageVisibility }

export interface TicketCommentFacts extends TicketVisibilityFacts {
  status: TicketStatus
}

export type TicketCommentBlockReason =
  | "COMMENTER_INACTIVE"
  | "PASSWORD_CHANGE_REQUIRED"
  | "CANNOT_VIEW"
  | "TICKET_FINISHED"

export interface TicketCommentFormOpen {
  state: "open"
}

export interface TicketCommentFormClosed {
  state: "closed"
  message: string
}

export interface TicketCommentFormHidden {
  state: "hidden"
}

export type TicketCommentFormState =
  TicketCommentFormOpen | TicketCommentFormClosed | TicketCommentFormHidden

export interface TicketMessageScope {
  viewerId: number
  includeInternal: boolean
}

export interface TicketMessageItem {
  id: number
  authorName: string
  content: string
  visibility: MessageVisibility
  createdAt: Date
}

export interface InsertTicketMessageValues {
  ticketId: number
  authorId: number
  content: string
  visibility: MessageVisibility
}

export interface TicketMessageSaved {
  status: "saved"
  ticketId: number
  messageId: number
}

export interface TicketNotCommentable {
  status: "not_commentable"
}

export type InsertTicketMessageOutcome =
  TicketMessageSaved | TicketNotFound | TicketNotCommentable

export interface TicketCommentFormDefaults {
  ticketId: number
  content: string
  isPrivate: boolean
}
