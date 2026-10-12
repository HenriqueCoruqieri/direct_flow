import type { TagOption } from "@/app/_lib/types/tag"
import type {
  AssigneeOption,
  TicketInvalidAssignee,
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
  assignedTo: number | null
  currentDepartmentId: number
  status: TicketStatus
  resolvedAt: Date | null
  hasPendingTransfer: boolean
}

export type TicketEditBlockReason =
  | "EDITOR_INACTIVE"
  | "PASSWORD_CHANGE_REQUIRED"
  | "NOT_ASSIGNEE"
  | "OUTSIDE_EDITOR_DEPARTMENT"
  | "AWAITING_APPROVAL"
  | "TICKET_FINISHED"
  | "STATUS_NOT_EDITABLE"

export interface TicketPendingTransferTarget {
  toDepartmentName: string
}

export interface TicketEditDetailFacts extends Omit<
  TicketEditabilityFacts,
  "hasPendingTransfer"
> {
  pendingTransfer: TicketPendingTransferTarget | null
}

export interface TicketEditSnapshot {
  title: string
  description: string
  type: TicketType
  tagId: number | null
  assignedTo: number | null
  solution: string | null
}

export interface TicketEditSource extends TicketEditSnapshot {
  id: number
  status: TicketStatus
  currentDepartmentName: string
}

export interface TicketEditValues {
  title: string
  description: string
  type: TicketType
  tagId: number
  assigneeId: number | null
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

export interface TicketAssigneeChange {
  fromAssigneeId: number | null
  toAssigneeId: number | null
}

export interface TicketEditChanges {
  title: boolean
  description: boolean
  type: TicketTypeChange | null
  tag: TicketTagChange | null
  assignee: TicketAssigneeChange | null
  solution: boolean
}

export interface UpdateTicketByAssigneeValues extends TicketEditValues {
  ticketId: number
  editorId: number
  handoffComment?: string
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

export interface TicketHandoffCommentRequired {
  status: "comment_required"
}

export type UpdateTicketByAssigneeOutcome =
  | TicketEditSaved
  | TicketNotFound
  | TicketNotEditable
  | TicketInvalidTag
  | TicketInvalidAssignee
  | TicketNoChanges
  | TicketHandoffCommentRequired

export interface EditTicketFormDefaults {
  ticketId: number
  title: string
  description: string
  type: TicketType
  tagId?: number
  assigneeId?: number | null
  solution?: string
}

export interface TicketEditFormOptions {
  defaults: EditTicketFormDefaults
  tags: TagOption[]
  tagHint?: string
  assignees: AssigneeOption[]
  assigneeHint?: string
  queueLabel: string
  includesSolution: boolean
}
