import type { TagOption } from "@/app/_lib/types/tag"
import type {
  TicketInvalidTag,
  TicketStatus,
  TicketType,
  TicketViewerFacts,
} from "@/app/_lib/types/ticket"

export interface TicketEditorFacts extends TicketViewerFacts {
  isActive: boolean
  mustChangePassword: boolean
}

export interface TicketEditabilityFacts {
  createdBy: number
  currentDepartmentId: number
  status: TicketStatus
  resolvedAt: Date | null
  hasPendingTransfer: boolean
}

export type TicketEditBlockReason =
  | "EDITOR_INACTIVE"
  | "PASSWORD_CHANGE_REQUIRED"
  | "NOT_AUTHOR"
  | "OUTSIDE_EDITOR_DEPARTMENT"
  | "TICKET_FINISHED"
  | "AWAITING_APPROVAL"
  | "STATUS_NOT_EDITABLE"

export interface TicketPendingTransferTarget {
  toDepartmentName: string
}

export interface TicketEditButtonFacts extends Omit<
  TicketEditabilityFacts,
  "hasPendingTransfer"
> {
  pendingTransfer: TicketPendingTransferTarget | null
}

export interface TicketEditButtonEditable {
  state: "editable"
}

export interface TicketEditButtonBlocked {
  state: "blocked"
  message: string
}

export interface TicketEditButtonHidden {
  state: "hidden"
}

export type TicketEditButtonState =
  TicketEditButtonEditable | TicketEditButtonBlocked | TicketEditButtonHidden

export interface TicketEditSnapshot {
  title: string
  description: string
  type: TicketType
  tagId: number | null
  solution: string | null
}

export interface TicketEditSource extends TicketEditSnapshot {
  id: number
  status: TicketStatus
}

export interface TicketEditValues {
  title: string
  description: string
  type: TicketType
  tagId: number
  solution?: string
}

export interface TicketTypeChange {
  from: TicketType
  to: TicketType
}

export interface TicketTagChange {
  fromTagId: number | null
  toTagId: number
}

export interface TicketEditChanges {
  title: boolean
  description: boolean
  type: TicketTypeChange | null
  tag: TicketTagChange | null
  solution: boolean
}

export interface UpdateTicketByAuthorValues extends TicketEditValues {
  ticketId: number
  authorId: number
}

export interface TicketEditSaved {
  status: "saved"
  ticketId: number
  tagChanged: boolean
}

export interface TicketNotFound {
  status: "not_found"
}

export interface TicketNotEditable {
  status: "not_editable"
}

export interface TicketNoChanges {
  status: "no_changes"
}

export type UpdateTicketByAuthorOutcome =
  | TicketEditSaved
  | TicketNotFound
  | TicketNotEditable
  | TicketInvalidTag
  | TicketNoChanges

export interface EditTicketFormDefaults {
  ticketId: number
  title: string
  description: string
  type: TicketType
  tagId?: number
  solution?: string
}

export interface TicketEditFormOptions {
  defaults: EditTicketFormDefaults
  tags: TagOption[]
  includesSolution: boolean
}
