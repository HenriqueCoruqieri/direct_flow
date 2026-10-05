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

export interface InsertTicketValues {
  title: string
  description: string
  type: TicketType
  tagId: number
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

export type InsertTicketOutcome = TicketSaved | TicketInvalidTag

export interface NewTicketFormAvailable {
  canCreate: true
  tags: TagOption[]
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
  changedByName: string | null
  fromStatus: TicketStatus | null
  toStatus: TicketStatus | null
  fromPriority: TicketPriority | null
  toPriority: TicketPriority | null
  fromDepartmentName: string | null
  toDepartmentName: string | null
  fromAssigneeName: string | null
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
