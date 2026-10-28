"use server"

import { revalidatePath } from "next/cache"

import { getSession } from "@/app/_lib/auth/session"
import {
  approveTicketTransfer,
  rejectTicketTransfer,
  requestTicketTransfer,
} from "@/app/_lib/data/tickets"
import { DASHBOARD_PATH } from "@/app/_lib/domain/dashboard"
import { DEPARTMENT_QUEUE_PATH } from "@/app/_lib/domain/department-queue"
import { MY_TICKETS_PATH } from "@/app/_lib/domain/my-tickets"
import {
  TICKET_NOT_FOUND_MESSAGE,
  ticketDetailPath,
} from "@/app/_lib/domain/ticket"
import {
  describeTicketAttended,
  TICKET_NOT_ATTENDABLE_MESSAGE,
} from "@/app/_lib/domain/ticket-assignment"
import {
  describeTicketSentToDepartment,
  describeTicketTransferConflict,
  describeTicketTransferDeclined,
  describeTicketTransferReviewConflict,
  TICKET_NOT_DECLINABLE_MESSAGE,
  TICKET_NOT_SENDABLE_TO_DEPARTMENT_MESSAGE,
  UNAVAILABLE_TRANSFER_ASSIGNEE_MESSAGE,
  UNAVAILABLE_TRANSFER_TARGET_MESSAGE,
} from "@/app/_lib/domain/ticket-transfer"
import type { StaleTicketCode } from "@/app/_lib/types/ticket"
import type {
  ApproveTicketTransferOutcome,
  RejectTicketTransferOutcome,
  RequestTicketTransferOutcome,
  TicketTransferApproved,
  TicketTransferRejected,
  TicketTransferRequested,
} from "@/app/_lib/types/ticket-transfer"
import {
  type AcceptTicketTransferInput,
  acceptTicketTransferSchema,
  type DeclineTicketTransferInput,
  declineTicketTransferSchema,
  type SendTicketToDepartmentInput,
  sendTicketToDepartmentSchema,
} from "@/app/_lib/validation/ticket-transfer"

export type SendTicketToDepartmentErrorCode =
  "INVALID_INPUT" | "INVALID_TARGET" | "INVALID_ASSIGNEE" | StaleTicketCode

export interface SendTicketToDepartmentSuccess {
  ok: true
  message: string
  keepsAccess: boolean
}

export interface SendTicketToDepartmentFailure {
  ok: false
  message: string
  code?: SendTicketToDepartmentErrorCode
}

export type SendTicketToDepartmentResult =
  SendTicketToDepartmentSuccess | SendTicketToDepartmentFailure

export type AcceptTicketTransferErrorCode = "INVALID_INPUT" | StaleTicketCode

export interface AcceptTicketTransferSuccess {
  ok: true
  message: string
}

export interface AcceptTicketTransferFailure {
  ok: false
  message: string
  code?: AcceptTicketTransferErrorCode
}

export type AcceptTicketTransferResult =
  AcceptTicketTransferSuccess | AcceptTicketTransferFailure

export type DeclineTicketTransferErrorCode = "INVALID_INPUT" | StaleTicketCode

export interface DeclineTicketTransferSuccess {
  ok: true
  message: string
  keepsAccess: boolean
}

export interface DeclineTicketTransferFailure {
  ok: false
  message: string
  code?: DeclineTicketTransferErrorCode
}

export type DeclineTicketTransferResult =
  DeclineTicketTransferSuccess | DeclineTicketTransferFailure

type RequestTicketTransferFailureOutcome = Exclude<
  RequestTicketTransferOutcome,
  TicketTransferRequested
>

type SendStaticFailureStatus = Exclude<
  RequestTicketTransferFailureOutcome["status"],
  "conflict"
>

type ApproveTicketTransferFailureOutcome = Exclude<
  ApproveTicketTransferOutcome,
  TicketTransferApproved
>

type AcceptStaticFailureStatus = Exclude<
  ApproveTicketTransferFailureOutcome["status"],
  "conflict"
>

type RejectTicketTransferFailureOutcome = Exclude<
  RejectTicketTransferOutcome,
  TicketTransferRejected
>

type DeclineStaticFailureStatus = Exclude<
  RejectTicketTransferFailureOutcome["status"],
  "conflict"
>

const SEND_UNEXPECTED_ERROR_MESSAGE =
  "Não foi possível enviar o chamado para outro setor agora. Tente novamente."

const SEND_FORBIDDEN_FAILURE: SendTicketToDepartmentFailure = {
  ok: false,
  code: "FORBIDDEN",
  message: "Você não tem permissão para enviar este chamado para outro setor.",
}

const SEND_UNEXPECTED_FAILURE: SendTicketToDepartmentFailure = {
  ok: false,
  message: SEND_UNEXPECTED_ERROR_MESSAGE,
}

const SEND_STATIC_OUTCOME_FAILURES = {
  not_found: {
    ok: false,
    code: "NOT_FOUND",
    message: TICKET_NOT_FOUND_MESSAGE,
  },
  not_transferable: {
    ok: false,
    code: "FORBIDDEN",
    message: TICKET_NOT_SENDABLE_TO_DEPARTMENT_MESSAGE,
  },
  invalid_target: {
    ok: false,
    code: "INVALID_TARGET",
    message: UNAVAILABLE_TRANSFER_TARGET_MESSAGE,
  },
  invalid_assignee: {
    ok: false,
    code: "INVALID_ASSIGNEE",
    message: UNAVAILABLE_TRANSFER_ASSIGNEE_MESSAGE,
  },
} satisfies Record<SendStaticFailureStatus, SendTicketToDepartmentFailure>

const ACCEPT_UNEXPECTED_ERROR_MESSAGE =
  "Não foi possível atender o chamado agora. Tente novamente."

const ACCEPT_FORBIDDEN_FAILURE: AcceptTicketTransferFailure = {
  ok: false,
  code: "FORBIDDEN",
  message: "Você não tem permissão para atender este chamado.",
}

const ACCEPT_UNEXPECTED_FAILURE: AcceptTicketTransferFailure = {
  ok: false,
  message: ACCEPT_UNEXPECTED_ERROR_MESSAGE,
}

const ACCEPT_STATIC_OUTCOME_FAILURES = {
  not_found: {
    ok: false,
    code: "NOT_FOUND",
    message: TICKET_NOT_FOUND_MESSAGE,
  },
  not_reviewable: {
    ok: false,
    code: "FORBIDDEN",
    message: TICKET_NOT_ATTENDABLE_MESSAGE,
  },
} satisfies Record<AcceptStaticFailureStatus, AcceptTicketTransferFailure>

const DECLINE_UNEXPECTED_ERROR_MESSAGE =
  "Não foi possível recusar o chamado agora. Tente novamente."

const DECLINE_FORBIDDEN_FAILURE: DeclineTicketTransferFailure = {
  ok: false,
  code: "FORBIDDEN",
  message: "Você não tem permissão para recusar este chamado.",
}

const DECLINE_UNEXPECTED_FAILURE: DeclineTicketTransferFailure = {
  ok: false,
  message: DECLINE_UNEXPECTED_ERROR_MESSAGE,
}

const DECLINE_STATIC_OUTCOME_FAILURES = {
  not_found: {
    ok: false,
    code: "NOT_FOUND",
    message: TICKET_NOT_FOUND_MESSAGE,
  },
  not_reviewable: {
    ok: false,
    code: "FORBIDDEN",
    message: TICKET_NOT_DECLINABLE_MESSAGE,
  },
} satisfies Record<DeclineStaticFailureStatus, DeclineTicketTransferFailure>

interface InvalidInputFailure {
  ok: false
  code: "INVALID_INPUT"
  message: string
}

const invalidInput = (
  firstIssueMessage: string | undefined,
  fallbackMessage: string,
): InvalidInputFailure => ({
  ok: false,
  code: "INVALID_INPUT",
  message: firstIssueMessage ?? fallbackMessage,
})

const sendFailureFor = (
  outcome: RequestTicketTransferFailureOutcome,
): SendTicketToDepartmentFailure => {
  if (outcome.status === "conflict") {
    return {
      ok: false,
      code: "CONFLICT",
      message: describeTicketTransferConflict(outcome),
    }
  }
  return SEND_STATIC_OUTCOME_FAILURES[outcome.status]
}

const acceptFailureFor = (
  outcome: ApproveTicketTransferFailureOutcome,
  actorId: number,
): AcceptTicketTransferFailure => {
  if (outcome.status === "conflict") {
    return {
      ok: false,
      code: "CONFLICT",
      message: describeTicketTransferReviewConflict(outcome, actorId),
    }
  }
  return ACCEPT_STATIC_OUTCOME_FAILURES[outcome.status]
}

const declineFailureFor = (
  outcome: RejectTicketTransferFailureOutcome,
  actorId: number,
): DeclineTicketTransferFailure => {
  if (outcome.status === "conflict") {
    return {
      ok: false,
      code: "CONFLICT",
      message: describeTicketTransferReviewConflict(outcome, actorId),
    }
  }
  return DECLINE_STATIC_OUTCOME_FAILURES[outcome.status]
}

export const sendTicketToDepartment = async (
  input: SendTicketToDepartmentInput,
): Promise<SendTicketToDepartmentResult> => {
  const actor = await getSession()
  if (!actor) return SEND_FORBIDDEN_FAILURE

  const parsed = sendTicketToDepartmentSchema.safeParse(input)
  if (!parsed.success) {
    return invalidInput(
      parsed.error.issues[0]?.message,
      SEND_UNEXPECTED_ERROR_MESSAGE,
    )
  }

  let outcome: RequestTicketTransferOutcome

  try {
    outcome = await requestTicketTransfer({
      ...parsed.data,
      actorId: actor.id,
    })
  } catch (error) {
    console.error("[sendTicketToDepartment]", error)
    return SEND_UNEXPECTED_FAILURE
  }

  if (outcome.status !== "saved") return sendFailureFor(outcome)

  if (outcome.actorKeepsAccess) {
    revalidatePath(ticketDetailPath(outcome.ticketId))
    revalidatePath(DEPARTMENT_QUEUE_PATH)
    revalidatePath(MY_TICKETS_PATH)
    revalidatePath(DASHBOARD_PATH)
  }

  return {
    ok: true,
    message: describeTicketSentToDepartment(
      outcome.ticketId,
      outcome.toDepartmentName,
      outcome.recipientName,
    ),
    keepsAccess: outcome.actorKeepsAccess,
  }
}

export const acceptTicketTransfer = async (
  input: AcceptTicketTransferInput,
): Promise<AcceptTicketTransferResult> => {
  const actor = await getSession()
  if (!actor) return ACCEPT_FORBIDDEN_FAILURE

  const parsed = acceptTicketTransferSchema.safeParse(input)
  if (!parsed.success) {
    return invalidInput(
      parsed.error.issues[0]?.message,
      ACCEPT_UNEXPECTED_ERROR_MESSAGE,
    )
  }

  let outcome: ApproveTicketTransferOutcome

  try {
    outcome = await approveTicketTransfer({
      ...parsed.data,
      actorId: actor.id,
    })
  } catch (error) {
    console.error("[acceptTicketTransfer]", error)
    return ACCEPT_UNEXPECTED_FAILURE
  }

  if (outcome.status !== "saved") return acceptFailureFor(outcome, actor.id)

  revalidatePath(ticketDetailPath(outcome.ticketId))
  revalidatePath(DEPARTMENT_QUEUE_PATH)
  revalidatePath(MY_TICKETS_PATH)
  revalidatePath(DASHBOARD_PATH)

  return {
    ok: true,
    message: describeTicketAttended(outcome.ticketId),
  }
}

export const declineTicketTransfer = async (
  input: DeclineTicketTransferInput,
): Promise<DeclineTicketTransferResult> => {
  const actor = await getSession()
  if (!actor) return DECLINE_FORBIDDEN_FAILURE

  const parsed = declineTicketTransferSchema.safeParse(input)
  if (!parsed.success) {
    return invalidInput(
      parsed.error.issues[0]?.message,
      DECLINE_UNEXPECTED_ERROR_MESSAGE,
    )
  }

  let outcome: RejectTicketTransferOutcome

  try {
    outcome = await rejectTicketTransfer({
      ...parsed.data,
      actorId: actor.id,
    })
  } catch (error) {
    console.error("[declineTicketTransfer]", error)
    return DECLINE_UNEXPECTED_FAILURE
  }

  if (outcome.status !== "saved") return declineFailureFor(outcome, actor.id)

  if (outcome.actorKeepsAccess) {
    revalidatePath(ticketDetailPath(outcome.ticketId))
    revalidatePath(DEPARTMENT_QUEUE_PATH)
    revalidatePath(MY_TICKETS_PATH)
    revalidatePath(DASHBOARD_PATH)
  }

  return {
    ok: true,
    message: describeTicketTransferDeclined(
      outcome.ticketId,
      outcome.returnedToDepartmentName,
    ),
    keepsAccess: outcome.actorKeepsAccess,
  }
}
