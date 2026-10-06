import type { Role } from "@/app/_lib/types/actor"
import type { TagOption } from "@/app/_lib/types/tag"
import type {
  HistoryEvent,
  TicketPriority,
  TicketStatus,
  TicketType,
} from "@/db/schema"

export type { HistoryEvent, TicketPriority, TicketStatus, TicketType }

export interface TicketAuthorFacts {
  isActive: boolean
  mustChangePassword: boolean
  isUnassigned: boolean
  departmentId: number
}

export type TicketCreationBlockReason =
  | "USER_INACTIVE"
  | "PASSWORD_CHANGE_REQUIRED"
  | "DEPARTMENT_UNASSIGNED"
  | "DEPARTMENT_WITHOUT_TAGS"

export interface TicketCreationAllowed {
  ok: true
}

export interface TicketCreationBlocked {
  ok: false
  reason: TicketCreationBlockReason
}

export type TicketCreationCheck = TicketCreationAllowed | TicketCreationBlocked

export interface TicketTagFacts {
  departmentId: number
  isActive: boolean
}

export interface TicketAssigneeFacts {
  departmentId: number
  isActive: boolean
}

export interface AssigneeOption {
  id: number
  name: string
}

export interface TicketCreatorFacts {
  id: number
  name: string
}

export interface InsertTicketValues {
  title: string
  description: string
  type: TicketType
  tagId: number
  assigneeId: number
  createdBy: number
  originDepartmentId: number
}

export interface TicketSaved {
  status: "saved"
  ticketId: number
}

export interface TicketInvalidTag {
  status: "invalid_tag"
}

export interface TicketInvalidAssignee {
  status: "invalid_assignee"
}

export type InsertTicketOutcome =
  TicketSaved | TicketInvalidTag | TicketInvalidAssignee

export interface NewTicketFormDefaults {
  title: string
  description: string
  assigneeId?: number
}

export interface NewTicketFormAvailable {
  canCreate: true
  tags: TagOption[]
  assignees: AssigneeOption[]
  creatorName: string
  defaults: NewTicketFormDefaults
}

export interface NewTicketFormBlocked {
  canCreate: false
  reason: TicketCreationBlockReason
  message: string
}

export type NewTicketFormOptions = NewTicketFormAvailable | NewTicketFormBlocked

export interface TicketViewerFacts {
  userId: number
  departmentId: number
  isBoard: boolean
}

export interface TicketActorFacts extends TicketViewerFacts {
  role: Role
  isActive: boolean
  mustChangePassword: boolean
}

export interface TicketVisibilityFacts {
  createdBy: number
  assignedTo: number | null
  currentDepartmentId: number
}

export interface TicketPendingTransfer {
  id: number
  fromDepartmentName: string
  toDepartmentId: number
  toDepartmentName: string
  requestedByName: string
  requestedAt: Date
  requestReason: string | null
}

export interface TicketHistoryEntry {
  id: number
  event: HistoryEvent
  changedAt: Date
  changedById: number | null
  changedByName: string | null
  fromStatus: TicketStatus | null
  toStatus: TicketStatus | null
  fromPriority: TicketPriority | null
  toPriority: TicketPriority | null
  fromDepartmentName: string | null
  toDepartmentName: string | null
  fromAssigneeName: string | null
  toAssigneeId: number | null
  toAssigneeName: string | null
  fromTagName: string | null
  toTagName: string | null
  note: string | null
}

export interface TicketDetail extends TicketVisibilityFacts {
  id: number
  title: string
  description: string
  type: TicketType
  status: TicketStatus
  priority: TicketPriority
  authorName: string
  assigneeName: string | null
  originDepartmentId: number
  originDepartmentName: string
  currentDepartmentName: string
  tagId: number | null
  tagName: string | null
  createdAt: Date
  solution: string | null
  resolvedAt: Date | null
  pendingTransfer: TicketPendingTransfer | null
  history: TicketHistoryEntry[]
}
