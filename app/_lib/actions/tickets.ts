"use server"

import { revalidatePath } from "next/cache"

import { getAccountFacts } from "@/app/_lib/auth/account-facts"
import { getSession } from "@/app/_lib/auth/session"
import { listActiveDepartmentTags } from "@/app/_lib/data/tags"
import { insertTicket } from "@/app/_lib/data/tickets"
import {
  checkTicketCreation,
  describeTicketCreated,
  TICKET_CREATION_BLOCK_MESSAGES,
} from "@/app/_lib/domain/ticket"
import type {
  InsertTicketOutcome,
  TicketCreationBlockReason,
} from "@/app/_lib/types/ticket"
import {
  type CreateTicketInput,
  createTicketSchema,
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
