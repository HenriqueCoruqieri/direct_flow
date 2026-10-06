"use server"

import { revalidatePath } from "next/cache"

import { getSession } from "@/app/_lib/auth/session"
import { updateTicketResolution } from "@/app/_lib/data/tickets"
import { DEPARTMENT_QUEUE_PATH } from "@/app/_lib/domain/department-queue"
import { MY_TICKETS_PATH } from "@/app/_lib/domain/my-tickets"
import {
  TICKET_NOT_FOUND_MESSAGE,
  ticketDetailPath,
} from "@/app/_lib/domain/ticket"
import { describeTicketResolved } from "@/app/_lib/domain/ticket-resolution"
import type { UpdateTicketResolutionOutcome } from "@/app/_lib/types/ticket-resolution"
import {
  type ResolveTicketInput,
  resolveTicketSchema,
} from "@/app/_lib/validation/ticket-resolution"

export type ResolveTicketErrorCode = "INVALID_INPUT" | "FORBIDDEN" | "NOT_FOUND"

export interface ResolveTicketSuccess {
  ok: true
  message: string
}

export interface ResolveTicketFailure {
  ok: false
  message: string
  code?: ResolveTicketErrorCode
}

export type ResolveTicketResult = ResolveTicketSuccess | ResolveTicketFailure

type UpdateTicketResolutionFailureStatus = Exclude<
  UpdateTicketResolutionOutcome["status"],
  "saved"
>

const UNEXPECTED_ERROR_MESSAGE =
  "Não foi possível resolver o chamado agora. Tente novamente."

const FORBIDDEN_FAILURE: ResolveTicketFailure = {
  ok: false,
  code: "FORBIDDEN",
  message: "Você não tem permissão para resolver este chamado.",
}

const UNEXPECTED_FAILURE: ResolveTicketFailure = {
  ok: false,
  message: UNEXPECTED_ERROR_MESSAGE,
}

const OUTCOME_FAILURES = {
  not_found: {
    ok: false,
    code: "NOT_FOUND",
    message: TICKET_NOT_FOUND_MESSAGE,
  },
  not_resolvable: {
    ok: false,
    code: "FORBIDDEN",
    message: "Você não pode resolver este chamado.",
  },
} satisfies Record<UpdateTicketResolutionFailureStatus, ResolveTicketFailure>

const invalidInput = (
  firstIssueMessage: string | undefined,
): ResolveTicketFailure => ({
  ok: false,
  code: "INVALID_INPUT",
  message: firstIssueMessage ?? UNEXPECTED_ERROR_MESSAGE,
})

export const resolveTicket = async (
  input: ResolveTicketInput,
): Promise<ResolveTicketResult> => {
  const actor = await getSession()
  if (!actor) return FORBIDDEN_FAILURE

  const parsed = resolveTicketSchema.safeParse(input)
  if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message)

  let outcome: UpdateTicketResolutionOutcome

  try {
    outcome = await updateTicketResolution({
      ticketId: parsed.data.ticketId,
      solution: parsed.data.solution,
      resolverId: actor.id,
    })
  } catch (error) {
    console.error("[resolveTicket]", error)
    return UNEXPECTED_FAILURE
  }

  if (outcome.status !== "saved") return OUTCOME_FAILURES[outcome.status]

  revalidatePath(ticketDetailPath(outcome.ticketId))
  revalidatePath(MY_TICKETS_PATH)
  revalidatePath(DEPARTMENT_QUEUE_PATH)

  return {
    ok: true,
    message: describeTicketResolved(outcome.ticketId),
  }
}
