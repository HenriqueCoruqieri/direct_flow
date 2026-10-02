"use server"

import { revalidatePath } from "next/cache"

import { getAccountFacts } from "@/app/_lib/auth/account-facts"
import { getSession } from "@/app/_lib/auth/session"
import { listActiveDepartmentTags } from "@/app/_lib/data/tags"
import { insertTicket, updateTicketByAuthor } from "@/app/_lib/data/tickets"
import { MY_TICKETS_PATH } from "@/app/_lib/domain/my-tickets"
import {
  checkTicketCreation,
  describeTicketCreated,
  TICKET_CREATION_BLOCK_MESSAGES,
  ticketDetailPath,
} from "@/app/_lib/domain/ticket"
import { describeTicketEdited } from "@/app/_lib/domain/ticket-edit"
import type {
  InsertTicketOutcome,
  TicketCreationBlockReason,
} from "@/app/_lib/types/ticket"
import type { UpdateTicketByAuthorOutcome } from "@/app/_lib/types/ticket-edit"
import {
  type CreateTicketInput,
  createTicketSchema,
  type EditTicketInput,
  editTicketSchema,
} from "@/app/_lib/validation/ticket"

export type TicketErrorCode =
  "INVALID_INPUT" | "FORBIDDEN" | "INVALID_TAG" | "INVALID_DESTINATION"

export interface CreateTicketSuccess {
  ok: true
  message: string
  ticketId: number
}

export interface TicketActionFailure {
  ok: false
  message: string
  code?: TicketErrorCode
}

export type CreateTicketResult = CreateTicketSuccess | TicketActionFailure

type InsertTicketFailureStatus = Exclude<InsertTicketOutcome["status"], "saved">

const DASHBOARD_PATH = "/dashboard"

const FORBIDDEN_MESSAGE = "Você não tem permissão para abrir chamados."
const INVALID_TAG_MESSAGE =
  "Esta tag não está disponível. Escolha uma tag ativa do seu setor."
const INVALID_DESTINATION_MESSAGE =
  "Este setor não pode receber chamados. Escolha outro setor de destino."
const UNEXPECTED_ERROR_MESSAGE =
  "Não foi possível abrir o chamado agora. Tente novamente."

const FORBIDDEN_FAILURE: TicketActionFailure = {
  ok: false,
  code: "FORBIDDEN",
  message: FORBIDDEN_MESSAGE,
}

const UNEXPECTED_FAILURE: TicketActionFailure = {
  ok: false,
  message: UNEXPECTED_ERROR_MESSAGE,
}

const OUTCOME_FAILURES = {
  invalid_tag: {
    ok: false,
    code: "INVALID_TAG",
    message: INVALID_TAG_MESSAGE,
  },
  invalid_destination: {
    ok: false,
    code: "INVALID_DESTINATION",
    message: INVALID_DESTINATION_MESSAGE,
  },
} satisfies Record<InsertTicketFailureStatus, TicketActionFailure>

const blocked = (reason: TicketCreationBlockReason): TicketActionFailure => ({
  ok: false,
  code: "FORBIDDEN",
  message: TICKET_CREATION_BLOCK_MESSAGES[reason],
})

const invalidInput = (
  firstIssueMessage: string | undefined,
): TicketActionFailure => ({
  ok: false,
  code: "INVALID_INPUT",
  message: firstIssueMessage ?? UNEXPECTED_ERROR_MESSAGE,
})

export const createTicket = async (
  input: CreateTicketInput,
): Promise<CreateTicketResult> => {
  const actor = await getSession()
  if (!actor) return FORBIDDEN_FAILURE

  let outcome: InsertTicketOutcome

  try {
    const facts = await getAccountFacts()
    if (!facts) return FORBIDDEN_FAILURE

    const tags = await listActiveDepartmentTags(facts.departmentId)
    const check = checkTicketCreation(facts, tags.length)
    if (!check.ok) return blocked(check.reason)

    const parsed = createTicketSchema.safeParse(input)
    if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message)

    outcome = await insertTicket({
      title: parsed.data.title,
      description: parsed.data.description,
      type: parsed.data.type,
      tagId: parsed.data.tagId,
      destinationDepartmentId: parsed.data.departmentId,
      createdBy: actor.id,
      originDepartmentId: facts.departmentId,
    })
  } catch (error) {
    console.error("[createTicket]", error)
    return UNEXPECTED_FAILURE
  }

  if (outcome.status !== "saved") return OUTCOME_FAILURES[outcome.status]

  revalidatePath(DASHBOARD_PATH)

  return {
    ok: true,
    message: describeTicketCreated(outcome),
    ticketId: outcome.ticketId,
  }
}

export type EditTicketErrorCode =
  "INVALID_INPUT" | "FORBIDDEN" | "NOT_FOUND" | "INVALID_TAG" | "NO_CHANGES"

export interface EditTicketSuccess {
  ok: true
  message: string
}

export interface EditTicketFailure {
  ok: false
  message: string
  code?: EditTicketErrorCode
}

export type EditTicketResult = EditTicketSuccess | EditTicketFailure

type UpdateTicketByAuthorFailureStatus = Exclude<
  UpdateTicketByAuthorOutcome["status"],
  "saved"
>

const EDIT_FORBIDDEN_MESSAGE =
  "Você não tem permissão para editar este chamado."
const EDIT_UNEXPECTED_ERROR_MESSAGE =
  "Não foi possível salvar o chamado agora. Tente novamente."

const EDIT_FORBIDDEN_FAILURE: EditTicketFailure = {
  ok: false,
  code: "FORBIDDEN",
  message: EDIT_FORBIDDEN_MESSAGE,
}

const EDIT_UNEXPECTED_FAILURE: EditTicketFailure = {
  ok: false,
  message: EDIT_UNEXPECTED_ERROR_MESSAGE,
}

const EDIT_OUTCOME_FAILURES = {
  not_found: {
    ok: false,
    code: "NOT_FOUND",
    message: "Chamado não encontrado.",
  },
  not_editable: {
    ok: false,
    code: "FORBIDDEN",
    message: "Você não pode editar este chamado.",
  },
  invalid_tag: {
    ok: false,
    code: "INVALID_TAG",
    message: INVALID_TAG_MESSAGE,
  },
  no_changes: {
    ok: false,
    code: "NO_CHANGES",
    message: "Nenhuma alteração para salvar.",
  },
} satisfies Record<UpdateTicketByAuthorFailureStatus, EditTicketFailure>

const editInvalidInput = (
  firstIssueMessage: string | undefined,
): EditTicketFailure => ({
  ok: false,
  code: "INVALID_INPUT",
  message: firstIssueMessage ?? EDIT_UNEXPECTED_ERROR_MESSAGE,
})

export const editTicket = async (
  input: EditTicketInput,
): Promise<EditTicketResult> => {
  const actor = await getSession()
  if (!actor) return EDIT_FORBIDDEN_FAILURE

  const parsed = editTicketSchema.safeParse(input)
  if (!parsed.success) return editInvalidInput(parsed.error.issues[0]?.message)

  let outcome: UpdateTicketByAuthorOutcome

  try {
    outcome = await updateTicketByAuthor({
      ...parsed.data,
      authorId: actor.id,
    })
  } catch (error) {
    console.error("[editTicket]", error)
    return EDIT_UNEXPECTED_FAILURE
  }

  if (outcome.status !== "saved") return EDIT_OUTCOME_FAILURES[outcome.status]

  revalidatePath(ticketDetailPath(outcome.ticketId))
  revalidatePath(MY_TICKETS_PATH)
  if (outcome.tagChanged) revalidatePath(DASHBOARD_PATH)

  return {
    ok: true,
    message: describeTicketEdited(outcome.ticketId),
  }
}
