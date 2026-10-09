import type { DepartmentAvailability } from "@/app/_lib/types/department"
import type {
  TicketStatus,
  TicketVisibilityFacts,
} from "@/app/_lib/types/ticket"
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

export interface TicketPendingTransferReview {
  id: number
  toDepartmentId: number
}

export interface TicketTransferReviewFacts extends TicketVisibilityFacts {
  status: TicketStatus
  pendingTransfer: TicketPendingTransferReview | null
}

export interface TicketTransferReviewSource extends TicketTransferReviewFacts {
  id: number
}

export type TicketTransferReviewActorBlockReason =
  TicketAssignmentActorBlockReason | "OUTSIDE_TARGET_DEPARTMENT"

export type TicketTransferReviewStateBlockReason =
  "NO_PENDING_TRANSFER" | "STATUS_NOT_AWAITING"

export type TicketTransferReviewBlockReason =
  TicketTransferReviewActorBlockReason | TicketTransferReviewStateBlockReason

export type TicketAttendKind = "start_work" | "accept_transfer"

export interface AcceptTicketTransferTarget {
  ticketId: number
  transferId: number
}

export interface TicketStartWorkAttendTarget {
  kind: "start_work"
  ticketId: number
}

export interface TicketAcceptTransferAttendTarget extends AcceptTicketTransferTarget {
  kind: "accept_transfer"
}

export type TicketAttendTarget =
  TicketStartWorkAttendTarget | TicketAcceptTransferAttendTarget

export interface ApproveTicketTransferValues {
  ticketId: number
  transferId: number
  actorId: number
}

export interface TicketTransferApproved {
  status: "saved"
  ticketId: number
}

export interface TicketTransferNotReviewable {
  status: "not_reviewable"
}

export type TicketTransferReviewConflictReason =
  TicketTransferReviewStateBlockReason | "TRANSFER_CHANGED"

export interface TicketTransferReviewConflict {
  status: "conflict"
  reason: TicketTransferReviewConflictReason
  currentStatus: TicketStatus
  currentDepartmentName: string
  currentAssigneeId: number | null
  currentAssigneeName: string | null
}

export type ApproveTicketTransferOutcome =
  | TicketTransferApproved
  | TicketNotFound
  | TicketTransferNotReviewable
  | TicketTransferReviewConflict
