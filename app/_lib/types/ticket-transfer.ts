import type { DepartmentAvailability } from "@/app/_lib/types/department"
import type { TicketStatus } from "@/app/_lib/types/ticket"
import type {
  TicketAssignmentActorBlockReason,
  TicketAttendDetailFacts,
} from "@/app/_lib/types/ticket-assignment"
import type { TicketNotFound } from "@/app/_lib/types/ticket-edit"

export type TicketDepartmentSendStateBlockReason =
  "NOT_SENDER" | "TICKET_FINISHED" | "AWAITING_APPROVAL" | "STATUS_NOT_SENDABLE"

export type TicketDepartmentSendBlockReason =
  TicketAssignmentActorBlockReason | TicketDepartmentSendStateBlockReason

export type TicketDepartmentSendDetailFacts = TicketAttendDetailFacts

export interface TransferTargetFacts extends DepartmentAvailability {
  id: number
}

export interface RequestTicketTransferValues {
  ticketId: number
  actorId: number
  toDepartmentId: number
  expectedDepartmentId: number
}

export interface TicketTransferRequested {
  status: "saved"
  ticketId: number
  toDepartmentName: string
  actorKeepsAccess: boolean
}

export interface TicketNotTransferable {
  status: "not_transferable"
}

export interface TicketInvalidTransferTarget {
  status: "invalid_target"
}

export type TicketTransferConflictReason =
  TicketDepartmentSendStateBlockReason | "DEPARTMENT_CHANGED"

export interface TicketTransferConflict {
  status: "conflict"
  reason: TicketTransferConflictReason
  currentStatus: TicketStatus
  currentDepartmentName: string
  pendingTransferDepartmentName: string | null
}

export type RequestTicketTransferOutcome =
  | TicketTransferRequested
  | TicketNotFound
  | TicketNotTransferable
  | TicketTransferConflict
  | TicketInvalidTransferTarget

export interface TicketTransferSource {
  id: number
  currentDepartmentId: number
}

export interface SendToDepartmentFormDefaults {
  ticketId: number
  expectedDepartmentId: number
  toDepartmentId?: number
}
