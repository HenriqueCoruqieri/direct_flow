"use server"

import { revalidatePath } from "next/cache"

import {
  discardPendingAttachments,
  discardRemovedAttachments,
  discardStoredAttachments,
  storePendingAttachments,
} from "@/app/_lib/actions/attachment-intake"
import { getAccountFacts } from "@/app/_lib/auth/account-facts"
import { getSession } from "@/app/_lib/auth/session"
import { listTicketAttachments } from "@/app/_lib/data/attachments"
import { listActiveDepartmentTags } from "@/app/_lib/data/tags"
import {
  findTicketAttachmentFacts,
  insertTicket,
  updateTicketByAssignee,
} from "@/app/_lib/data/tickets"
import {
  canUploadAttachment,
  describeInvalidAttachment,
  TICKET_ATTACHMENTS_LIMIT_MESSAGE,
} from "@/app/_lib/domain/attachment"
import { DASHBOARD_PATH } from "@/app/_lib/domain/dashboard"
import { DEPARTMENT_QUEUE_PATH } from "@/app/_lib/domain/department-queue"
import { MY_TICKETS_PATH } from "@/app/_lib/domain/my-tickets"
import {
  canViewTicket,
  checkTicketCreation,
  describeTicketCreated,
  TICKET_CREATION_BLOCK_MESSAGES,
  TICKET_NOT_FOUND_MESSAGE,
  ticketDetailPath,
} from "@/app/_lib/domain/ticket"
import {
  ATTACHMENT_ASSIGNEE_ONLY_MESSAGE,
  ATTACHMENT_REMOVAL_NOT_FOUND_MESSAGE,
  ticketAttachmentEditRefusalFor,
} from "@/app/_lib/domain/ticket-attachment"
import {
  canEditSolution,
  canEditTicket,
  describeTicketEdited,
} from "@/app/_lib/domain/ticket-edit"
import { HANDOFF_COMMENT_REQUIRED_MESSAGE } from "@/app/_lib/domain/ticket-handoff"
import type { StoredAttachmentValues } from "@/app/_lib/types/attachment"
import type {
  InsertTicketOutcome,
  TicketActorFacts,
  TicketCreationBlockReason,
} from "@/app/_lib/types/ticket"
import type {
  TicketEditRefusal,
  UpdateTicketByAssigneeOutcome,
} from "@/app/_lib/types/ticket-edit"
import type { UploadedAttachmentInput } from "@/app/_lib/validation/attachment"
import {
  type CreateTicketInput,
  createTicketSchema,
  type EditTicketInput,
  editTicketSchema,
} from "@/app/_lib/validation/ticket"

export type TicketErrorCode =
  | "INVALID_INPUT"
  | "FORBIDDEN"
  | "INVALID_TAG"
  | "INVALID_ASSIGNEE"
  | "INVALID_ATTACHMENT"

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

const FORBIDDEN_MESSAGE = "Você não tem permissão para abrir chamados."
const INVALID_TAG_MESSAGE =
  "Esta tag não está disponível. Escolha uma tag ativa do seu setor."
const INVALID_ASSIGNEE_MESSAGE =
  "Este destinatário não está disponível. Escolha uma pessoa ativa do seu setor."
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
  invalid_assignee: {
    ok: false,
    code: "INVALID_ASSIGNEE",
    message: INVALID_ASSIGNEE_MESSAGE,
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

const invalidAttachment = (fileName: string): TicketActionFailure => ({
  ok: false,
  code: "INVALID_ATTACHMENT",
  message: describeInvalidAttachment(fileName),
})

const CREATE_LOG_SCOPE = "[createTicket]"

export const createTicket = async (
  input: CreateTicketInput,
): Promise<CreateTicketResult> => {
  const actor = await getSession()
  if (!actor) return FORBIDDEN_FAILURE

  let outcome: InsertTicketOutcome
  let refs: UploadedAttachmentInput[] = []
  let stored: StoredAttachmentValues[] = []

  try {
    const facts = await getAccountFacts()
    if (!facts) return FORBIDDEN_FAILURE

    const tags = await listActiveDepartmentTags(facts.departmentId)
    const check = checkTicketCreation(facts, tags.length)
    if (!check.ok) return blocked(check.reason)

    const parsed = createTicketSchema.safeParse(input)
    if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message)

    const pending = parsed.data.attachments ?? []
    const intake = await storePendingAttachments(
      pending,
      actor.id,
      CREATE_LOG_SCOPE,
    )
    if (intake.status === "rejected") return invalidAttachment(intake.fileName)

    refs = pending
    stored = intake.attachments

    outcome = await insertTicket({
      title: parsed.data.title,
      description: parsed.data.description,
      type: parsed.data.type,
      tagId: parsed.data.tagId,
      assigneeId: parsed.data.assigneeId,
      createdBy: actor.id,
      originDepartmentId: facts.departmentId,
      attachments: intake.attachments,
    })
  } catch (error) {
    console.error(CREATE_LOG_SCOPE, error)
    await discardStoredAttachments(stored, CREATE_LOG_SCOPE)
    return UNEXPECTED_FAILURE
  }

  if (outcome.status !== "saved") {
    await discardStoredAttachments(stored, CREATE_LOG_SCOPE)
    return OUTCOME_FAILURES[outcome.status]
  }

  await discardPendingAttachments(refs, CREATE_LOG_SCOPE)

  revalidatePath(DASHBOARD_PATH)
  revalidatePath(MY_TICKETS_PATH)
  revalidatePath(DEPARTMENT_QUEUE_PATH)

  return {
    ok: true,
    message: describeTicketCreated(outcome.ticketId),
    ticketId: outcome.ticketId,
  }
}

export type EditTicketErrorCode =
  | "INVALID_INPUT"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_TAG"
  | "INVALID_ASSIGNEE"
  | "NO_CHANGES"
  | "HANDOFF_COMMENT_REQUIRED"
  | "INVALID_ATTACHMENT"
  | "ATTACHMENT_NOT_FOUND"
  | "ATTACHMENTS_LIMIT"

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

type UpdateTicketByAssigneeFailureStatus = Exclude<
  UpdateTicketByAssigneeOutcome["status"],
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
    message: TICKET_NOT_FOUND_MESSAGE,
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
  invalid_assignee: {
    ok: false,
    code: "INVALID_ASSIGNEE",
    message: INVALID_ASSIGNEE_MESSAGE,
  },
  no_changes: {
    ok: false,
    code: "NO_CHANGES",
    message: "Nenhuma alteração para salvar.",
  },
  comment_required: {
    ok: false,
    code: "HANDOFF_COMMENT_REQUIRED",
    message: HANDOFF_COMMENT_REQUIRED_MESSAGE,
  },
} satisfies Record<UpdateTicketByAssigneeFailureStatus, EditTicketFailure>

const editInvalidInput = (
  firstIssueMessage: string | undefined,
): EditTicketFailure => ({
  ok: false,
  code: "INVALID_INPUT",
  message: firstIssueMessage ?? EDIT_UNEXPECTED_ERROR_MESSAGE,
})

const ATTACHMENT_EDIT_FAILURES = {
  attachments_not_allowed: {
    ok: false,
    code: "FORBIDDEN",
    message: ATTACHMENT_ASSIGNEE_ONLY_MESSAGE,
  },
  attachment_not_found: {
    ok: false,
    code: "ATTACHMENT_NOT_FOUND",
    message: ATTACHMENT_REMOVAL_NOT_FOUND_MESSAGE,
  },
  attachments_limit: {
    ok: false,
    code: "ATTACHMENTS_LIMIT",
    message: TICKET_ATTACHMENTS_LIMIT_MESSAGE,
  },
} satisfies Record<TicketEditRefusal, EditTicketFailure>

const EDIT_LOG_SCOPE = "[editTicket]"

interface AttachmentEditRequest {
  actorId: number
  ticketId: number
  solution?: string
  removedIds: readonly number[]
  addedCount: number
}

const attachmentEditFailureFor = async (
  request: AttachmentEditRequest,
): Promise<EditTicketFailure | null> => {
  const now = new Date()
  const [facts, ticketFacts, saved] = await Promise.all([
    getAccountFacts(),
    findTicketAttachmentFacts(request.ticketId),
    listTicketAttachments(request.ticketId),
  ])
  if (!facts || !canUploadAttachment(facts)) {
    return EDIT_OUTCOME_FAILURES.not_editable
  }

  const actorFacts: TicketActorFacts = {
    userId: request.actorId,
    departmentId: facts.departmentId,
    isBoard: facts.isBoard,
    role: facts.role,
    isActive: facts.isActive,
    mustChangePassword: facts.mustChangePassword,
  }
  if (!ticketFacts || !canViewTicket(actorFacts, ticketFacts)) {
    return EDIT_OUTCOME_FAILURES.not_found
  }
  if (!canEditTicket(actorFacts, ticketFacts, now)) {
    return EDIT_OUTCOME_FAILURES.not_editable
  }
  if (request.solution !== undefined && !canEditSolution(ticketFacts.status)) {
    return EDIT_OUTCOME_FAILURES.not_editable
  }

  const refusal = ticketAttachmentEditRefusalFor(
    actorFacts,
    ticketFacts,
    {
      savedIds: saved.map(({ id }) => id),
      removedIds: request.removedIds,
      addedCount: request.addedCount,
    },
    now,
  )
  return refusal === null ? null : ATTACHMENT_EDIT_FAILURES[refusal]
}

export const editTicket = async (
  input: EditTicketInput,
): Promise<EditTicketResult> => {
  const actor = await getSession()
  if (!actor) return EDIT_FORBIDDEN_FAILURE

  const parsed = editTicketSchema.safeParse(input)
  if (!parsed.success) return editInvalidInput(parsed.error.issues[0]?.message)

  const {
    attachments: refs = [],
    removedAttachmentIds = [],
    ...fields
  } = parsed.data

  let outcome: UpdateTicketByAssigneeOutcome
  let stored: StoredAttachmentValues[] = []

  try {
    if (refs.length > 0) {
      const failure = await attachmentEditFailureFor({
        actorId: actor.id,
        ticketId: fields.ticketId,
        solution: fields.solution,
        removedIds: removedAttachmentIds,
        addedCount: refs.length,
      })
      if (failure) return failure
    }

    const intake = await storePendingAttachments(refs, actor.id, EDIT_LOG_SCOPE)
    if (intake.status === "rejected") {
      return {
        ok: false,
        code: "INVALID_ATTACHMENT",
        message: describeInvalidAttachment(intake.fileName),
      }
    }

    stored = intake.attachments

    outcome = await updateTicketByAssignee({
      ...fields,
      editorId: actor.id,
      addedAttachments: stored,
      removedAttachmentIds,
    })
  } catch (error) {
    console.error(EDIT_LOG_SCOPE, error)
    await discardStoredAttachments(stored, EDIT_LOG_SCOPE)
    return EDIT_UNEXPECTED_FAILURE
  }

  if (outcome.status !== "saved") {
    await discardStoredAttachments(stored, EDIT_LOG_SCOPE)
    if (outcome.status === "not_editable" && outcome.reason !== undefined) {
      return ATTACHMENT_EDIT_FAILURES[outcome.reason]
    }
    return EDIT_OUTCOME_FAILURES[outcome.status]
  }

  await Promise.all([
    discardPendingAttachments(refs, EDIT_LOG_SCOPE),
    discardRemovedAttachments(outcome.removedStorageKeys ?? [], EDIT_LOG_SCOPE),
  ])

  revalidatePath(ticketDetailPath(outcome.ticketId))
  revalidatePath(MY_TICKETS_PATH)
  revalidatePath(DEPARTMENT_QUEUE_PATH)
  if (outcome.tagChanged) revalidatePath(DASHBOARD_PATH)

  return {
    ok: true,
    message: describeTicketEdited(outcome.ticketId),
  }
}
