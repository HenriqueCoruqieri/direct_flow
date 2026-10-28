import type { DepartmentAvailability } from "@/app/_lib/types/department"
import type {
  AssigneeOption,
  TicketStatus,
  TicketTransferRecipientFacts,
  TicketVisibilityFacts,
} from "@/app/_lib/types/ticket"
import type {
  TicketAssignmentActorBlockReason,
  TicketAttendDetailFacts,
} from "@/app/_lib/types/ticket-assignment"
import type { TicketNotFound } from "@/app/_lib/types/ticket-edit"
import type { ApprovalStatus } from "@/db/schema"

export type { ApprovalStatus }

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
  assigneeId: number | null
  expectedDepartmentId: number
  comment: string
}

export interface TransferAssigneeOption extends AssigneeOption {
  departmentId: number
}

export interface TicketTransferRequested {
  status: "saved"
  ticketId: number
  toDepartmentName: string
  recipientName: string | null
  actorKeepsAccess: boolean
}

export interface TicketNotTransferable {
  status: "not_transferable"
}

export interface TicketInvalidTransferTarget {
  status: "invalid_target"
}

export interface TicketInvalidTransferAssignee {
  status: "invalid_assignee"
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
  | TicketInvalidTransferAssignee

export interface TicketTransferSource {
  id: number
  currentDepartmentId: number
}

export interface SendToDepartmentFormDefaults {
  ticketId: number
  expectedDepartmentId: number
  toDepartmentId?: number
  assigneeId: number | null
  comment: string
}

export interface TicketPendingTransferReview {
  id: number
  toDepartmentId: number
  recipient: TicketTransferRecipientFacts | null
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
  "NO_PENDING_TRANSFER" | "STATUS_NOT_AWAITING" | "NOT_TRANSFER_RECIPIENT"

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
  | TicketTransferReviewStateBlockReason
  | "TRANSFER_CHANGED"
  | "TRANSFER_DECLINED"

export interface TicketTransferReviewConflict {
  status: "conflict"
  reason: TicketTransferReviewConflictReason
  currentStatus: TicketStatus
  currentDepartmentName: string
  currentAssigneeId: number | null
  currentAssigneeName: string | null
  recipientName: string | null
}

export type ApproveTicketTransferOutcome =
  | TicketTransferApproved
  | TicketNotFound
  | TicketTransferNotReviewable
  | TicketTransferReviewConflict

export interface TicketReviewedTransferFacts {
  toDepartmentId: number
  status: ApprovalStatus
}

export type TicketTransferDeclineBlockReason = TicketTransferReviewBlockReason

export interface TicketPendingTransferDecline extends TicketPendingTransferReview {
  fromDepartmentName: string
}

export interface DeclineTicketTransferSource extends TicketTransferReviewSource {
  pendingTransfer: TicketPendingTransferDecline | null
}

export interface DeclineTicketTransferTarget extends AcceptTicketTransferTarget {
  fromDepartmentName: string
}

export interface DeclineTicketTransferFormDefaults {
  ticketId: number
  transferId: number
  reason: string
}

export interface TicketDeclineReturnFacts {
  fromDepartmentId: number
  requestedBy: number
}

export interface RejectTicketTransferValues {
  ticketId: number
  transferId: number
  actorId: number
  reason: string
}

export interface TicketTransferRejected {
  status: "saved"
  ticketId: number
  returnedToDepartmentName: string
  actorKeepsAccess: boolean
}

export type RejectTicketTransferOutcome =
  | TicketTransferRejected
  | TicketNotFound
  | TicketTransferNotReviewable
  | TicketTransferReviewConflict
