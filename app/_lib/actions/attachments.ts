"use server"

import { getAccountFacts } from "@/app/_lib/auth/account-facts"
import { getSession } from "@/app/_lib/auth/session"
import {
  ATTACHMENT_TYPE_NOT_ALLOWED_MESSAGE,
  ATTACHMENT_UPLOAD_FORBIDDEN_MESSAGE,
  ATTACHMENT_UPLOAD_UNEXPECTED_MESSAGE,
  attachmentExtensionOf,
  attachmentTypeFor,
  canUploadAttachment,
} from "@/app/_lib/domain/attachment"
import { createAttachmentUploadUrl } from "@/app/_lib/storage/attachments"
import type {
  AttachmentUploadTarget,
  RequestAttachmentUploadFailure,
  RequestAttachmentUploadResult,
} from "@/app/_lib/types/attachment"
import type { RegistryAccessFacts } from "@/app/_lib/types/registry"
import {
  type RequestAttachmentUploadInput,
  requestAttachmentUploadSchema,
} from "@/app/_lib/validation/attachment"

const LOG_PREFIX = "[requestAttachmentUpload]"

const FORBIDDEN_FAILURE: RequestAttachmentUploadFailure = {
  ok: false,
  code: "FORBIDDEN",
  message: ATTACHMENT_UPLOAD_FORBIDDEN_MESSAGE,
}

const UNEXPECTED_FAILURE: RequestAttachmentUploadFailure = {
  ok: false,
  message: ATTACHMENT_UPLOAD_UNEXPECTED_MESSAGE,
}

const invalidInput = (message: string): RequestAttachmentUploadFailure => ({
  ok: false,
  code: "INVALID_INPUT",
  message,
})

export const requestAttachmentUpload = async (
  input: RequestAttachmentUploadInput,
): Promise<RequestAttachmentUploadResult> => {
  const actor = await getSession()
  if (!actor) return FORBIDDEN_FAILURE

  let facts: RegistryAccessFacts | null

  try {
    facts = await getAccountFacts()
  } catch (error) {
    console.error(LOG_PREFIX, error)
    return UNEXPECTED_FAILURE
  }

  if (!facts || !canUploadAttachment(facts)) return FORBIDDEN_FAILURE

  const parsed = requestAttachmentUploadSchema.safeParse(input)
  if (!parsed.success) {
    return invalidInput(
      parsed.error.issues[0]?.message ?? ATTACHMENT_TYPE_NOT_ALLOWED_MESSAGE,
    )
  }

  const extension = attachmentExtensionOf(parsed.data.fileName)
  if (extension === null) {
    return invalidInput(ATTACHMENT_TYPE_NOT_ALLOWED_MESSAGE)
  }

  let upload: AttachmentUploadTarget

  try {
    upload = await createAttachmentUploadUrl(actor.id, {
      ...attachmentTypeFor(extension),
      sizeBytes: parsed.data.sizeBytes,
    })
  } catch (error) {
    console.error(LOG_PREFIX, error)
    return UNEXPECTED_FAILURE
  }

  return { ok: true, upload }
}
