"use server"

import { revalidatePath } from "next/cache"

import { getSession } from "@/app/_lib/auth/session"
import { insertTicketMessage } from "@/app/_lib/data/ticket-messages"
import {
  TICKET_NOT_FOUND_MESSAGE,
  ticketDetailPath,
} from "@/app/_lib/domain/ticket"
import {
  messageVisibilityFor,
  TICKET_COMMENT_ADDED_MESSAGE,
} from "@/app/_lib/domain/ticket-comments"
import type { InsertTicketMessageOutcome } from "@/app/_lib/types/ticket-comments"
import {
  type CreateTicketCommentInput,
  createTicketCommentSchema,
} from "@/app/_lib/validation/ticket-comments"

export type AddTicketCommentErrorCode =
  "INVALID_INPUT" | "FORBIDDEN" | "NOT_FOUND"

export interface AddTicketCommentSuccess {
  ok: true
  message: string
}

export interface AddTicketCommentFailure {
  ok: false
  message: string
  code?: AddTicketCommentErrorCode
}

export type AddTicketCommentResult =
  AddTicketCommentSuccess | AddTicketCommentFailure

type InsertTicketMessageFailureStatus = Exclude<
  InsertTicketMessageOutcome["status"],
  "saved"
>

const UNEXPECTED_ERROR_MESSAGE =
  "Não foi possível publicar o comentário agora. Tente novamente."

const FORBIDDEN_FAILURE: AddTicketCommentFailure = {
  ok: false,
  code: "FORBIDDEN",
  message: "Você não tem permissão para comentar neste chamado.",
}

const UNEXPECTED_FAILURE: AddTicketCommentFailure = {
  ok: false,
  message: UNEXPECTED_ERROR_MESSAGE,
}

const OUTCOME_FAILURES = {
  not_found: {
    ok: false,
    code: "NOT_FOUND",
    message: TICKET_NOT_FOUND_MESSAGE,
  },
  not_commentable: {
    ok: false,
    code: "FORBIDDEN",
    message: "Você não pode comentar neste chamado.",
  },
} satisfies Record<InsertTicketMessageFailureStatus, AddTicketCommentFailure>

const invalidInput = (
  firstIssueMessage: string | undefined,
): AddTicketCommentFailure => ({
  ok: false,
  code: "INVALID_INPUT",
  message: firstIssueMessage ?? UNEXPECTED_ERROR_MESSAGE,
})

export const addTicketComment = async (
  input: CreateTicketCommentInput,
): Promise<AddTicketCommentResult> => {
  const actor = await getSession()
  if (!actor) return FORBIDDEN_FAILURE

  const parsed = createTicketCommentSchema.safeParse(input)
  if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message)

  let outcome: InsertTicketMessageOutcome

  try {
    outcome = await insertTicketMessage({
      ticketId: parsed.data.ticketId,
      authorId: actor.id,
      content: parsed.data.content,
      visibility: messageVisibilityFor(parsed.data.isPrivate),
    })
  } catch (error) {
    console.error("[addTicketComment]", error)
    return UNEXPECTED_FAILURE
  }

  if (outcome.status !== "saved") return OUTCOME_FAILURES[outcome.status]

  revalidatePath(ticketDetailPath(outcome.ticketId))

  return {
    ok: true,
    message: TICKET_COMMENT_ADDED_MESSAGE,
  }
}
