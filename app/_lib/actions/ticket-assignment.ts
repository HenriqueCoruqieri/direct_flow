"use server"

import { revalidatePath } from "next/cache"

import { getSession } from "@/app/_lib/auth/session"
import { assignTicket } from "@/app/_lib/data/tickets"
import { DEPARTMENT_QUEUE_PATH } from "@/app/_lib/domain/department-queue"
import { MY_TICKETS_PATH } from "@/app/_lib/domain/my-tickets"
import {
  TICKET_NOT_FOUND_MESSAGE,
  ticketDetailPath,
} from "@/app/_lib/domain/ticket"
import {
  describeTicketAssignmentConflict,
  describeTicketAssumed,
  describeTicketSent,
  TICKET_NOT_ASSUMABLE_MESSAGE,
  TICKET_NOT_SENDABLE_MESSAGE,
  UNAVAILABLE_SEND_TARGET_MESSAGE,
} from "@/app/_lib/domain/ticket-assignment"
import type {
  AssignTicketOutcome,
  AssignTicketValues,
  TicketAssignmentSaved,
} from "@/app/_lib/types/ticket-assignment"
import {
  type AssumeTicketInput,
  assumeTicketSchema,
  type SendTicketInput,
  sendTicketSchema,
} from "@/app/_lib/validation/ticket-assignment"

export type AssignTicketErrorCode =
  "INVALID_INPUT" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "INVALID_ASSIGNEE"

export interface AssignTicketSuccess {
  ok: true
  message: string
}

export interface AssignTicketFailure {
  ok: false
  message: string
  code?: AssignTicketErrorCode
}

export type AssignTicketResult = AssignTicketSuccess | AssignTicketFailure

type AssignTicketMode = AssignTicketValues["mode"]

type AssignTicketFailureOutcome = Exclude<
  AssignTicketOutcome,
  TicketAssignmentSaved
>

type StaticFailureStatus = Exclude<
  AssignTicketFailureOutcome["status"],
  "conflict" | "not_assignable"
>

const UNEXPECTED_ERROR_MESSAGE =
  "Não foi possível atribuir o chamado agora. Tente novamente."

const FORBIDDEN_FAILURE: AssignTicketFailure = {
  ok: false,
  code: "FORBIDDEN",
  message: "Você não tem permissão para atribuir chamados.",
}

const UNEXPECTED_FAILURE: AssignTicketFailure = {
  ok: false,
  message: UNEXPECTED_ERROR_MESSAGE,
}

const STATIC_OUTCOME_FAILURES = {
  not_found: {
    ok: false,
    code: "NOT_FOUND",
    message: TICKET_NOT_FOUND_MESSAGE,
  },
  invalid_assignee: {
    ok: false,
    code: "INVALID_ASSIGNEE",
    message: UNAVAILABLE_SEND_TARGET_MESSAGE,
  },
} satisfies Record<StaticFailureStatus, AssignTicketFailure>

const NOT_ASSIGNABLE_FAILURES = {
  assume: {
    ok: false,
    code: "FORBIDDEN",
    message: TICKET_NOT_ASSUMABLE_MESSAGE,
  },
  send: {
    ok: false,
    code: "FORBIDDEN",
    message: TICKET_NOT_SENDABLE_MESSAGE,
  },
} satisfies Record<AssignTicketMode, AssignTicketFailure>

const SUCCESS_MESSAGES = {
  assume: (outcome) => describeTicketAssumed(outcome.ticketId),
  send: (outcome) => describeTicketSent(outcome.ticketId, outcome.assigneeName),
} satisfies Record<AssignTicketMode, (outcome: TicketAssignmentSaved) => string>

const LOG_PREFIXES = {
  assume: "[assumeTicket]",
  send: "[sendTicket]",
} satisfies Record<AssignTicketMode, string>

const invalidInput = (
  firstIssueMessage: string | undefined,
): AssignTicketFailure => ({
  ok: false,
  code: "INVALID_INPUT",
  message: firstIssueMessage ?? UNEXPECTED_ERROR_MESSAGE,
})

const failureFor = (
  outcome: AssignTicketFailureOutcome,
  mode: AssignTicketMode,
  actorId: number,
): AssignTicketFailure => {
  if (outcome.status === "conflict") {
    return {
      ok: false,
      code: "CONFLICT",
      message: describeTicketAssignmentConflict(outcome, actorId),
    }
  }
  if (outcome.status === "not_assignable") return NOT_ASSIGNABLE_FAILURES[mode]
  return STATIC_OUTCOME_FAILURES[outcome.status]
}

const runAssignment = async (
  values: AssignTicketValues,
): Promise<AssignTicketResult> => {
  let outcome: AssignTicketOutcome

  try {
    outcome = await assignTicket(values)
  } catch (error) {
    console.error(LOG_PREFIXES[values.mode], error)
    return UNEXPECTED_FAILURE
  }

  if (outcome.status !== "saved") {
    return failureFor(outcome, values.mode, values.actorId)
  }

  revalidatePath(DEPARTMENT_QUEUE_PATH)
  revalidatePath(ticketDetailPath(outcome.ticketId))
  revalidatePath(MY_TICKETS_PATH)

  return {
    ok: true,
    message: SUCCESS_MESSAGES[values.mode](outcome),
  }
}

export const assumeTicket = async (
  input: AssumeTicketInput,
): Promise<AssignTicketResult> => {
  const actor = await getSession()
  if (!actor) return FORBIDDEN_FAILURE

  const parsed = assumeTicketSchema.safeParse(input)
  if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message)

  return runAssignment({
    mode: "assume",
    ticketId: parsed.data.ticketId,
    actorId: actor.id,
    expectedAssigneeId: parsed.data.expectedAssigneeId,
  })
}

export const sendTicket = async (
  input: SendTicketInput,
): Promise<AssignTicketResult> => {
  const actor = await getSession()
  if (!actor) return FORBIDDEN_FAILURE

  const parsed = sendTicketSchema.safeParse(input)
  if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message)

  return runAssignment({
    mode: "send",
    ticketId: parsed.data.ticketId,
    actorId: actor.id,
    assigneeId: parsed.data.assigneeId,
    expectedAssigneeId: parsed.data.expectedAssigneeId,
  })
}
