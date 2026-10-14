"use server"

import { revalidatePath } from "next/cache"

import {
  discardPendingAttachments,
  discardStoredAttachments,
  storePendingAttachments,
} from "@/app/_lib/actions/attachment-intake"
import { getAccountFacts } from "@/app/_lib/auth/account-facts"
import { getSession } from "@/app/_lib/auth/session"
import {
  findTicketAttachmentFacts,
  updateTicketResolution,
} from "@/app/_lib/data/tickets"
import {
  canUploadAttachment,
  describeInvalidAttachment,
} from "@/app/_lib/domain/attachment"
import { DEPARTMENT_QUEUE_PATH } from "@/app/_lib/domain/department-queue"
import { MY_TICKETS_PATH } from "@/app/_lib/domain/my-tickets"
import {
  canViewTicket,
  TICKET_NOT_FOUND_MESSAGE,
  ticketDetailPath,
} from "@/app/_lib/domain/ticket"
import {
  ATTACHMENT_ASSIGNEE_ONLY_MESSAGE,
  canAttachToTicket,
} from "@/app/_lib/domain/ticket-attachment"
import {
  canResolveTicket,
  describeTicketResolved,
} from "@/app/_lib/domain/ticket-resolution"
import type { StoredAttachmentValues } from "@/app/_lib/types/attachment"
import type { TicketActorFacts } from "@/app/_lib/types/ticket"
import type { UpdateTicketResolutionOutcome } from "@/app/_lib/types/ticket-resolution"
import {
  type ResolveTicketInput,
  resolveTicketSchema,
} from "@/app/_lib/validation/ticket-resolution"

export type ResolveTicketErrorCode =
  "INVALID_INPUT" | "FORBIDDEN" | "NOT_FOUND" | "INVALID_ATTACHMENT"

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

const RESOLVE_LOG_SCOPE = "[resolveTicket]"

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

const ATTACHMENTS_NOT_ALLOWED_FAILURE: ResolveTicketFailure = {
  ok: false,
  code: "FORBIDDEN",
  message: ATTACHMENT_ASSIGNEE_ONLY_MESSAGE,
}

const invalidInput = (
  firstIssueMessage: string | undefined,
): ResolveTicketFailure => ({
  ok: false,
  code: "INVALID_INPUT",
  message: firstIssueMessage ?? UNEXPECTED_ERROR_MESSAGE,
})

const invalidAttachment = (fileName: string): ResolveTicketFailure => ({
  ok: false,
  code: "INVALID_ATTACHMENT",
  message: describeInvalidAttachment(fileName),
})

export const resolveTicket = async (
  input: ResolveTicketInput,
): Promise<ResolveTicketResult> => {
  const actor = await getSession()
  if (!actor) return FORBIDDEN_FAILURE

  const parsed = resolveTicketSchema.safeParse(input)
  if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message)

  const refs = parsed.data.attachments ?? []

  let outcome: UpdateTicketResolutionOutcome
  let stored: StoredAttachmentValues[] = []

  try {
    if (refs.length > 0) {
      const [facts, ticketFacts] = await Promise.all([
        getAccountFacts(),
        findTicketAttachmentFacts(parsed.data.ticketId),
      ])
      if (!facts || !canUploadAttachment(facts)) {
        return OUTCOME_FAILURES.not_resolvable
      }

      const actorFacts: TicketActorFacts = {
        userId: actor.id,
        departmentId: facts.departmentId,
        isBoard: facts.isBoard,
        role: facts.role,
        isActive: facts.isActive,
        mustChangePassword: facts.mustChangePassword,
      }
      if (!ticketFacts || !canViewTicket(actorFacts, ticketFacts)) {
        return OUTCOME_FAILURES.not_found
      }
      if (!canResolveTicket(actorFacts, ticketFacts)) {
        return OUTCOME_FAILURES.not_resolvable
      }
      if (!canAttachToTicket(actorFacts, ticketFacts, new Date())) {
        return ATTACHMENTS_NOT_ALLOWED_FAILURE
      }
    }

    const intake = await storePendingAttachments(
      refs,
      actor.id,
      RESOLVE_LOG_SCOPE,
    )
    if (intake.status === "rejected") return invalidAttachment(intake.fileName)

    stored = intake.attachments

    outcome = await updateTicketResolution({
      ticketId: parsed.data.ticketId,
      solution: parsed.data.solution,
      resolverId: actor.id,
      attachments: stored,
    })
  } catch (error) {
    console.error(RESOLVE_LOG_SCOPE, error)
    await discardStoredAttachments(stored, RESOLVE_LOG_SCOPE)
    return UNEXPECTED_FAILURE
  }

  if (outcome.status !== "saved") {
    await discardStoredAttachments(stored, RESOLVE_LOG_SCOPE)
    if (
      outcome.status === "not_resolvable" &&
      outcome.reason === "attachments_not_allowed"
    ) {
      return ATTACHMENTS_NOT_ALLOWED_FAILURE
    }
    return OUTCOME_FAILURES[outcome.status]
  }

  await discardPendingAttachments(refs, RESOLVE_LOG_SCOPE)

  revalidatePath(ticketDetailPath(outcome.ticketId))
  revalidatePath(MY_TICKETS_PATH)
  revalidatePath(DEPARTMENT_QUEUE_PATH)

  return {
    ok: true,
    message: describeTicketResolved(outcome.ticketId),
  }
}
