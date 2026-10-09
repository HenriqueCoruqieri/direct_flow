"use server"

import { revalidatePath } from "next/cache"

import { getSession } from "@/app/_lib/auth/session"
import {
  approveTicketTransfer,
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
  describeTicketTransferReviewConflict,
  TICKET_NOT_SENDABLE_TO_DEPARTMENT_MESSAGE,
  UNAVAILABLE_TRANSFER_TARGET_MESSAGE,
} from "@/app/_lib/domain/ticket-transfer"
import type {
  ApproveTicketTransferOutcome,
  RequestTicketTransferOutcome,
  TicketTransferApproved,
  TicketTransferRequested,
} from "@/app/_lib/types/ticket-transfer"
import {
  type AcceptTicketTransferInput,
  acceptTicketTransferSchema,
  type SendTicketToDepartmentInput,
  sendTicketToDepartmentSchema,
} from "@/app/_lib/validation/ticket-transfer"

export type SendTicketToDepartmentErrorCode =
  "INVALID_INPUT" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "INVALID_TARGET"

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

export type AcceptTicketTransferErrorCode =
  "INVALID_INPUT" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT"

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
