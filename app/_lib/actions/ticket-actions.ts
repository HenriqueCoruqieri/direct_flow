"use server"

import { revalidatePath } from "next/cache"

import { getSession } from "@/app/_lib/auth/session"
import { updateTicketActions } from "@/app/_lib/data/tickets"
import {
  TICKET_NOT_FOUND_MESSAGE,
  ticketDetailPath,
} from "@/app/_lib/domain/ticket"
import {
  describeTicketActionsSaved,
  normalizeTicketActions,
  TICKET_ACTIONS_FORBIDDEN_MESSAGE,
  TICKET_ACTIONS_NOT_EDITABLE_MESSAGE,
  TICKET_ACTIONS_UNEXPECTED_ERROR_MESSAGE,
} from "@/app/_lib/domain/ticket-actions"
import type { UpdateTicketActionsOutcome } from "@/app/_lib/types/ticket-actions"
import {
  type SaveTicketActionsInput,
  saveTicketActionsSchema,
} from "@/app/_lib/validation/ticket-actions"

export type SaveTicketActionsErrorCode =
  "INVALID_INPUT" | "FORBIDDEN" | "NOT_FOUND"

export interface SaveTicketActionsSuccess {
  ok: true
  message: string
}

export interface SaveTicketActionsFailure {
  ok: false
  message: string
  code?: SaveTicketActionsErrorCode
}

export type SaveTicketActionsResult =
  SaveTicketActionsSuccess | SaveTicketActionsFailure

type UpdateTicketActionsFailureStatus = Exclude<
  UpdateTicketActionsOutcome["status"],
  "saved"
>

const SAVE_ACTIONS_LOG_SCOPE = "[saveTicketActions]"

const FORBIDDEN_FAILURE: SaveTicketActionsFailure = {
  ok: false,
  code: "FORBIDDEN",
  message: TICKET_ACTIONS_FORBIDDEN_MESSAGE,
}

const UNEXPECTED_FAILURE: SaveTicketActionsFailure = {
  ok: false,
  message: TICKET_ACTIONS_UNEXPECTED_ERROR_MESSAGE,
}

const OUTCOME_FAILURES = {
  not_found: {
    ok: false,
    code: "NOT_FOUND",
    message: TICKET_NOT_FOUND_MESSAGE,
  },
  not_editable: {
    ok: false,
    code: "FORBIDDEN",
    message: TICKET_ACTIONS_NOT_EDITABLE_MESSAGE,
  },
} satisfies Record<UpdateTicketActionsFailureStatus, SaveTicketActionsFailure>

const invalidInput = (
  firstIssueMessage: string | undefined,
): SaveTicketActionsFailure => ({
  ok: false,
  code: "INVALID_INPUT",
  message: firstIssueMessage ?? TICKET_ACTIONS_UNEXPECTED_ERROR_MESSAGE,
})

export const saveTicketActions = async (
  input: SaveTicketActionsInput,
): Promise<SaveTicketActionsResult> => {
  const actor = await getSession()
  if (!actor) return FORBIDDEN_FAILURE

  const parsed = saveTicketActionsSchema.safeParse(input)
  if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message)

  let outcome: UpdateTicketActionsOutcome

  try {
    outcome = await updateTicketActions({
      ticketId: parsed.data.ticketId,
      actions: normalizeTicketActions(parsed.data.actions),
      actorId: actor.id,
    })
  } catch (error) {
    console.error(SAVE_ACTIONS_LOG_SCOPE, error)
    return UNEXPECTED_FAILURE
  }

  if (outcome.status !== "saved") return OUTCOME_FAILURES[outcome.status]

  revalidatePath(ticketDetailPath(outcome.ticketId))

  return {
    ok: true,
    message: describeTicketActionsSaved(outcome.ticketId),
  }
}
