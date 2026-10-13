"use server"

import { revalidatePath } from "next/cache"

import { getAccountFacts } from "@/app/_lib/auth/account-facts"
import { getSession } from "@/app/_lib/auth/session"
import { listActiveDepartmentTags } from "@/app/_lib/data/tags"
import { insertTicket, updateTicketByAssignee } from "@/app/_lib/data/tickets"
import {
  describeInvalidAttachment,
  detectAttachmentType,
  isPendingAttachmentKeyOf,
  parsePendingAttachmentKey,
} from "@/app/_lib/domain/attachment"
import { DASHBOARD_PATH } from "@/app/_lib/domain/dashboard"
import { DEPARTMENT_QUEUE_PATH } from "@/app/_lib/domain/department-queue"
import { MY_TICKETS_PATH } from "@/app/_lib/domain/my-tickets"
import {
  checkTicketCreation,
  describeTicketCreated,
  TICKET_CREATION_BLOCK_MESSAGES,
  TICKET_NOT_FOUND_MESSAGE,
  ticketDetailPath,
} from "@/app/_lib/domain/ticket"
import { describeTicketEdited } from "@/app/_lib/domain/ticket-edit"
import { HANDOFF_COMMENT_REQUIRED_MESSAGE } from "@/app/_lib/domain/ticket-handoff"
import {
  copyPendingAttachment,
  deleteAttachmentObject,
  headPendingAttachment,
  readPendingAttachmentHeader,
} from "@/app/_lib/storage/attachments"
import type {
  AttachmentTypeMatch,
  StoredAttachmentObject,
  StoredAttachmentValues,
} from "@/app/_lib/types/attachment"
import type {
  InsertTicketOutcome,
  TicketCreationBlockReason,
} from "@/app/_lib/types/ticket"
import type { UpdateTicketByAssigneeOutcome } from "@/app/_lib/types/ticket-edit"
import {
  attachmentSizeSchema,
  type UploadedAttachmentInput,
} from "@/app/_lib/validation/attachment"
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

interface VerifiedAttachment {
  status: "verified"
  key: string
  fileName: string
  etag: string
  sizeBytes: number
  match: AttachmentTypeMatch
}

interface CopiedAttachment {
  status: "copied"
  values: StoredAttachmentValues
}

interface AttachmentCopyFailed {
  status: "failed"
  error: unknown
}

interface AttachmentRejected {
  status: "rejected"
  fileName: string
}

interface AttachmentsStored {
  status: "stored"
  attachments: StoredAttachmentValues[]
}

type AttachmentCheck = VerifiedAttachment | AttachmentRejected

type AttachmentCopy =
  CopiedAttachment | AttachmentRejected | AttachmentCopyFailed

type AttachmentCopyFailure = Exclude<AttachmentCopy, CopiedAttachment>

type AttachmentsIntake = AttachmentsStored | AttachmentRejected

const ROLLBACK_LOG_PREFIX = "[createTicket] rollback"

const rejectAttachment = (fileName: string): AttachmentRejected => ({
  status: "rejected",
  fileName,
})

const isVerified = (check: AttachmentCheck): check is VerifiedAttachment =>
  check.status === "verified"

const deleteAttachmentObjectsQuietly = async (
  keys: readonly string[],
  logPrefix: string,
): Promise<void> => {
  const results = await Promise.allSettled(keys.map(deleteAttachmentObject))

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(logPrefix, keys[index], result.reason)
    }
  })
}

const verifyPendingAttachment = async (
  ref: UploadedAttachmentInput,
  userId: number,
): Promise<AttachmentCheck> => {
  const parts = parsePendingAttachmentKey(ref.key)
  if (!parts || !isPendingAttachmentKeyOf(ref.key, userId)) {
    return rejectAttachment(ref.fileName)
  }

  const head = await headPendingAttachment(ref.key)
  if (!head || !attachmentSizeSchema.safeParse(head.sizeBytes).success) {
    return rejectAttachment(ref.fileName)
  }

  const bytes = await readPendingAttachmentHeader(ref.key, head.etag)
  if (!bytes) return rejectAttachment(ref.fileName)

  const match = detectAttachmentType(ref.fileName, bytes)
  if (!match || match.extension !== parts.extension) {
    return rejectAttachment(ref.fileName)
  }

  return {
    status: "verified",
    key: ref.key,
    fileName: ref.fileName,
    etag: head.etag,
    sizeBytes: head.sizeBytes,
    match,
  }
}

const copyVerifiedAttachment = async (
  item: VerifiedAttachment,
): Promise<AttachmentCopy> => {
  let stored: StoredAttachmentObject | null

  try {
    stored = await copyPendingAttachment(item.key, item.etag, item.match)
  } catch (error) {
    return { status: "failed", error }
  }

  if (!stored) return rejectAttachment(item.fileName)

  return {
    status: "copied",
    values: {
      fileName: item.fileName,
      mimeType: item.match.contentType,
      sizeBytes: item.sizeBytes,
      storageKey: stored.storageKey,
    },
  }
}

const storePendingAttachments = async (
  refs: readonly UploadedAttachmentInput[],
  userId: number,
): Promise<AttachmentsIntake> => {
  if (refs.length === 0) return { status: "stored", attachments: [] }

  const checks = await Promise.all(
    refs.map((ref) => verifyPendingAttachment(ref, userId)),
  )

  const verified: VerifiedAttachment[] = []
  for (const check of checks) {
    if (!isVerified(check)) return check
    verified.push(check)
  }

  const copies = await Promise.all(verified.map(copyVerifiedAttachment))

  const attachments: StoredAttachmentValues[] = []
  let failure: AttachmentCopyFailure | null = null

  for (const copy of copies) {
    if (copy.status === "copied") attachments.push(copy.values)
    else failure ??= copy
  }

  if (failure === null) return { status: "stored", attachments }

  await deleteAttachmentObjectsQuietly(
    attachments.map(({ storageKey }) => storageKey),
    ROLLBACK_LOG_PREFIX,
  )

  if (failure.status === "failed") throw failure.error

  return failure
}

export const createTicket = async (
  input: CreateTicketInput,
): Promise<CreateTicketResult> => {
  const actor = await getSession()
  if (!actor) return FORBIDDEN_FAILURE

  let outcome: InsertTicketOutcome
  let pendingKeys: string[] = []
  let storedKeys: string[] = []

  try {
    const facts = await getAccountFacts()
    if (!facts) return FORBIDDEN_FAILURE

    const tags = await listActiveDepartmentTags(facts.departmentId)
    const check = checkTicketCreation(facts, tags.length)
    if (!check.ok) return blocked(check.reason)

    const parsed = createTicketSchema.safeParse(input)
    if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message)

    const refs = parsed.data.attachments ?? []
    const intake = await storePendingAttachments(refs, actor.id)
    if (intake.status === "rejected") return invalidAttachment(intake.fileName)

    pendingKeys = refs.map(({ key }) => key)
    storedKeys = intake.attachments.map(({ storageKey }) => storageKey)

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
    console.error("[createTicket]", error)
    await deleteAttachmentObjectsQuietly(storedKeys, ROLLBACK_LOG_PREFIX)
    return UNEXPECTED_FAILURE
  }

  if (outcome.status !== "saved") {
    await deleteAttachmentObjectsQuietly(storedKeys, ROLLBACK_LOG_PREFIX)
    return OUTCOME_FAILURES[outcome.status]
  }

  await deleteAttachmentObjectsQuietly(pendingKeys, "[createTicket] cleanup")

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

export const editTicket = async (
  input: EditTicketInput,
): Promise<EditTicketResult> => {
  const actor = await getSession()
  if (!actor) return EDIT_FORBIDDEN_FAILURE

  const parsed = editTicketSchema.safeParse(input)
  if (!parsed.success) return editInvalidInput(parsed.error.issues[0]?.message)

  let outcome: UpdateTicketByAssigneeOutcome

  try {
    outcome = await updateTicketByAssignee({
      ...parsed.data,
      editorId: actor.id,
    })
  } catch (error) {
    console.error("[editTicket]", error)
    return EDIT_UNEXPECTED_FAILURE
  }

  if (outcome.status !== "saved") return EDIT_OUTCOME_FAILURES[outcome.status]

  revalidatePath(ticketDetailPath(outcome.ticketId))
  revalidatePath(MY_TICKETS_PATH)
  revalidatePath(DEPARTMENT_QUEUE_PATH)
  if (outcome.tagChanged) revalidatePath(DASHBOARD_PATH)

  return {
    ok: true,
    message: describeTicketEdited(outcome.ticketId),
  }
}
