"use server"

import { revalidatePath } from "next/cache"

import { getSession } from "@/app/_lib/auth/session"
import {
  deleteTicketMessage,
  insertTicketMessage,
  updateTicketMessage,
} from "@/app/_lib/data/ticket-messages"
import {
  TICKET_NOT_FOUND_MESSAGE,
  ticketDetailPath,
} from "@/app/_lib/domain/ticket"
import {
  messageVisibilityFor,
  TICKET_COMMENT_ADDED_MESSAGE,
  TICKET_COMMENT_DELETED_MESSAGE,
  TICKET_COMMENT_EDITED_MESSAGE,
  TICKET_COMMENT_GONE_MESSAGE,
} from "@/app/_lib/domain/ticket-comments"
import type {
  DeleteTicketMessageOutcome,
  InsertTicketMessageOutcome,
  UpdateTicketMessageOutcome,
} from "@/app/_lib/types/ticket-comments"
import {
  type CreateTicketCommentInput,
  createTicketCommentSchema,
  type DeleteTicketCommentInput,
  deleteTicketCommentSchema,
  type EditTicketCommentInput,
  editTicketCommentSchema,
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

export type EditTicketCommentErrorCode =
  "INVALID_INPUT" | "FORBIDDEN" | "NOT_FOUND" | "NO_CHANGES"

export interface EditTicketCommentSuccess {
  ok: true
  message: string
}

export interface EditTicketCommentFailure {
  ok: false
  message: string
  code?: EditTicketCommentErrorCode
}

export type EditTicketCommentResult =
  EditTicketCommentSuccess | EditTicketCommentFailure

export type DeleteTicketCommentErrorCode =
  "INVALID_INPUT" | "FORBIDDEN" | "NOT_FOUND"

export interface DeleteTicketCommentSuccess {
  ok: true
  message: string
}

export interface DeleteTicketCommentFailure {
  ok: false
  message: string
  code?: DeleteTicketCommentErrorCode
}

export type DeleteTicketCommentResult =
  DeleteTicketCommentSuccess | DeleteTicketCommentFailure

type InsertTicketMessageFailureStatus = Exclude<
  InsertTicketMessageOutcome["status"],
  "saved"
>

type UpdateTicketMessageFailureStatus = Exclude<
  UpdateTicketMessageOutcome["status"],
  "saved"
>

type DeleteTicketMessageFailureStatus = Exclude<
  DeleteTicketMessageOutcome["status"],
  "deleted"
>

const ADD_UNEXPECTED_ERROR_MESSAGE =
  "Não foi possível publicar o comentário agora. Tente novamente."

const ADD_FORBIDDEN_FAILURE: AddTicketCommentFailure = {
  ok: false,
  code: "FORBIDDEN",
  message: "Você não tem permissão para comentar neste chamado.",
}

const ADD_UNEXPECTED_FAILURE: AddTicketCommentFailure = {
  ok: false,
  message: ADD_UNEXPECTED_ERROR_MESSAGE,
}

const ADD_OUTCOME_FAILURES = {
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

const EDIT_UNEXPECTED_ERROR_MESSAGE =
  "Não foi possível salvar o comentário agora. Tente novamente."

const EDIT_FORBIDDEN_FAILURE: EditTicketCommentFailure = {
  ok: false,
  code: "FORBIDDEN",
  message: "Você não tem permissão para editar este comentário.",
}

const EDIT_UNEXPECTED_FAILURE: EditTicketCommentFailure = {
  ok: false,
  message: EDIT_UNEXPECTED_ERROR_MESSAGE,
}

const EDIT_OUTCOME_FAILURES = {
  not_found: {
    ok: false,
    code: "NOT_FOUND",
    message: "Comentário não encontrado.",
  },
  not_editable: {
    ok: false,
    code: "FORBIDDEN",
    message: "Você não pode editar este comentário.",
  },
  no_changes: {
    ok: false,
    code: "NO_CHANGES",
    message: "Nenhuma alteração para salvar.",
  },
} satisfies Record<UpdateTicketMessageFailureStatus, EditTicketCommentFailure>

const DELETE_UNEXPECTED_ERROR_MESSAGE =
  "Não foi possível excluir o comentário agora. Tente novamente."

const DELETE_FORBIDDEN_FAILURE: DeleteTicketCommentFailure = {
  ok: false,
  code: "FORBIDDEN",
  message: "Você não tem permissão para excluir este comentário.",
}

const DELETE_UNEXPECTED_FAILURE: DeleteTicketCommentFailure = {
  ok: false,
  message: DELETE_UNEXPECTED_ERROR_MESSAGE,
}

const DELETE_OUTCOME_FAILURES = {
  not_found: {
    ok: false,
    code: "NOT_FOUND",
    message: TICKET_COMMENT_GONE_MESSAGE,
  },
  not_deletable: {
    ok: false,
    code: "FORBIDDEN",
    message: "Você não pode excluir este comentário.",
  },
} satisfies Record<DeleteTicketMessageFailureStatus, DeleteTicketCommentFailure>

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

export const addTicketComment = async (
  input: CreateTicketCommentInput,
): Promise<AddTicketCommentResult> => {
  const actor = await getSession()
  if (!actor) return ADD_FORBIDDEN_FAILURE

  const parsed = createTicketCommentSchema.safeParse(input)
  if (!parsed.success) {
    return invalidInput(
      parsed.error.issues[0]?.message,
      ADD_UNEXPECTED_ERROR_MESSAGE,
    )
  }

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
    return ADD_UNEXPECTED_FAILURE
  }

  if (outcome.status !== "saved") return ADD_OUTCOME_FAILURES[outcome.status]

  revalidatePath(ticketDetailPath(outcome.ticketId))

  return {
    ok: true,
    message: TICKET_COMMENT_ADDED_MESSAGE,
  }
}

export const editTicketComment = async (
  input: EditTicketCommentInput,
): Promise<EditTicketCommentResult> => {
  const actor = await getSession()
  if (!actor) return EDIT_FORBIDDEN_FAILURE

  const parsed = editTicketCommentSchema.safeParse(input)
  if (!parsed.success) {
    return invalidInput(
      parsed.error.issues[0]?.message,
      EDIT_UNEXPECTED_ERROR_MESSAGE,
    )
  }

  let outcome: UpdateTicketMessageOutcome

  try {
    outcome = await updateTicketMessage({
      ticketId: parsed.data.ticketId,
      messageId: parsed.data.messageId,
      editorId: actor.id,
      content: parsed.data.content,
    })
  } catch (error) {
    console.error("[editTicketComment]", error)
    return EDIT_UNEXPECTED_FAILURE
  }

  if (outcome.status !== "saved") return EDIT_OUTCOME_FAILURES[outcome.status]

  revalidatePath(ticketDetailPath(outcome.ticketId))

  return {
    ok: true,
    message: TICKET_COMMENT_EDITED_MESSAGE,
  }
}

export const deleteTicketComment = async (
  input: DeleteTicketCommentInput,
): Promise<DeleteTicketCommentResult> => {
  const actor = await getSession()
  if (!actor) return DELETE_FORBIDDEN_FAILURE

  const parsed = deleteTicketCommentSchema.safeParse(input)
  if (!parsed.success) {
    return invalidInput(
      parsed.error.issues[0]?.message,
      DELETE_UNEXPECTED_ERROR_MESSAGE,
    )
  }

  let outcome: DeleteTicketMessageOutcome

  try {
    outcome = await deleteTicketMessage({
      ticketId: parsed.data.ticketId,
      messageId: parsed.data.messageId,
      actorId: actor.id,
    })
  } catch (error) {
    console.error("[deleteTicketComment]", error)
    return DELETE_UNEXPECTED_FAILURE
  }

  if (outcome.status !== "deleted") {
    return DELETE_OUTCOME_FAILURES[outcome.status]
  }

  revalidatePath(ticketDetailPath(outcome.ticketId))

  return {
    ok: true,
    message: TICKET_COMMENT_DELETED_MESSAGE,
  }
}
