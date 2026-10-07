import type {
  TicketStatus,
  TicketVisibilityFacts,
} from "@/app/_lib/types/ticket"
import type {
  TicketNoChanges,
  TicketNotEditable,
  TicketNotFound,
} from "@/app/_lib/types/ticket-edit"
import type { MessageVisibility } from "@/db/schema"

export type { MessageVisibility }

export interface TicketCommentFacts extends TicketVisibilityFacts {
  status: TicketStatus
  resolvedAt: Date | null
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
  authorId: number
  authorName: string
  content: string
  visibility: MessageVisibility
  createdAt: Date
  updatedAt: Date
}

export interface TicketMessageAuthorFacts {
  authorId: number
}

export interface TicketMessageVisibilityFacts extends TicketMessageAuthorFacts {
  visibility: MessageVisibility
}

export interface TicketMessageTimestamps {
  createdAt: Date
  updatedAt: Date
}

export type TicketCommentEditBlockReason =
  TicketCommentBlockReason | "NOT_COMMENT_AUTHOR"

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

export interface UpdateTicketMessageValues {
  ticketId: number
  messageId: number
  editorId: number
  content: string
}

export type UpdateTicketMessageOutcome =
  TicketMessageSaved | TicketNotFound | TicketNotEditable | TicketNoChanges

export interface EditTicketCommentFormDefaults {
  ticketId: number
  messageId: number
  content: string
}
