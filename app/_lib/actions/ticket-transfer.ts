"use server"

import { revalidatePath } from "next/cache"

import { getSession } from "@/app/_lib/auth/session"
import { requestTicketTransfer } from "@/app/_lib/data/tickets"
import { DASHBOARD_PATH } from "@/app/_lib/domain/dashboard"
import { DEPARTMENT_QUEUE_PATH } from "@/app/_lib/domain/department-queue"
import { MY_TICKETS_PATH } from "@/app/_lib/domain/my-tickets"
import {
  TICKET_NOT_FOUND_MESSAGE,
  ticketDetailPath,
} from "@/app/_lib/domain/ticket"
import {
  describeTicketSentToDepartment,
  describeTicketTransferConflict,
  TICKET_NOT_SENDABLE_TO_DEPARTMENT_MESSAGE,
  UNAVAILABLE_TRANSFER_TARGET_MESSAGE,
} from "@/app/_lib/domain/ticket-transfer"
import type {
  RequestTicketTransferOutcome,
  TicketTransferRequested,
} from "@/app/_lib/types/ticket-transfer"
import {
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

type RequestTicketTransferFailureOutcome = Exclude<
  RequestTicketTransferOutcome,
  TicketTransferRequested
>

type SendStaticFailureStatus = Exclude<
  RequestTicketTransferFailureOutcome["status"],
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

export const sendTicketToDepartment = async (
  input: SendTicketToDepartmentInput,
): Promise<SendTicketToDepartmentResult> => {
  const actor = await getSession()
  if (!actor) return SEND_FORBIDDEN_FAILURE

  const parsed = sendTicketToDepartmentSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: parsed.error.issues[0]?.message ?? SEND_UNEXPECTED_ERROR_MESSAGE,
    }
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
