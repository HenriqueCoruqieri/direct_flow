import "server-only"

import {
  detectAttachmentType,
  isPendingAttachmentKeyOf,
  parsePendingAttachmentKey,
} from "@/app/_lib/domain/attachment"
import {
  copyPendingAttachment,
  deleteAttachmentObject,
  headPendingAttachment,
  readPendingAttachmentHeader,
} from "@/app/_lib/storage/attachments"
import type {
  AttachmentRejected,
  AttachmentsIntake,
  AttachmentTypeMatch,
  StoredAttachmentObject,
  StoredAttachmentValues,
} from "@/app/_lib/types/attachment"
import {
  attachmentSizeSchema,
  type UploadedAttachmentInput,
} from "@/app/_lib/validation/attachment"

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

type AttachmentCheck = VerifiedAttachment | AttachmentRejected

type AttachmentCopy =
  CopiedAttachment | AttachmentRejected | AttachmentCopyFailed

type AttachmentCopyFailure = Exclude<AttachmentCopy, CopiedAttachment>

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

export const discardStoredAttachments = async (
  attachments: readonly StoredAttachmentValues[],
  logScope: string,
): Promise<void> => {
  await deleteAttachmentObjectsQuietly(
    attachments.map(({ storageKey }) => storageKey),
    `${logScope} rollback`,
  )
}

export const discardPendingAttachments = async (
  refs: readonly UploadedAttachmentInput[],
  logScope: string,
): Promise<void> => {
  await deleteAttachmentObjectsQuietly(
    refs.map(({ key }) => key),
    `${logScope} cleanup`,
  )
}

export const discardRemovedAttachments = async (
  storageKeys: readonly string[],
  logScope: string,
): Promise<void> => {
  await deleteAttachmentObjectsQuietly(storageKeys, `${logScope} remove`)
}

export const storePendingAttachments = async (
  refs: readonly UploadedAttachmentInput[],
  userId: number,
  logScope: string,
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

  await discardStoredAttachments(attachments, logScope)

  if (failure.status === "failed") throw failure.error

  return failure
}
