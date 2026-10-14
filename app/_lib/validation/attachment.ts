import { z } from "zod"

import {
  ATTACHMENT_DUPLICATE_MESSAGE,
  ATTACHMENT_EMPTY_MESSAGE,
  ATTACHMENT_FILE_NAME_MAX_LENGTH,
  ATTACHMENT_INVALID_FILE_NAME_MESSAGE,
  ATTACHMENT_INVALID_REFERENCE_MESSAGE,
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MAX_FILES,
  ATTACHMENT_TOO_LARGE_MESSAGE,
  ATTACHMENT_TOO_MANY_MESSAGE,
  ATTACHMENT_TYPE_NOT_ALLOWED_MESSAGE,
  attachmentExtensionOf,
  isSafeAttachmentFileName,
  parsePendingAttachmentKey,
} from "@/app/_lib/domain/attachment"
import { idSearchParamSchema } from "@/app/_lib/validation/search-params"

export const attachmentFileNameSchema = z
  .string({ error: ATTACHMENT_INVALID_FILE_NAME_MESSAGE })
  .trim()
  .min(1, { error: ATTACHMENT_INVALID_FILE_NAME_MESSAGE })
  .max(ATTACHMENT_FILE_NAME_MAX_LENGTH, {
    error: `O nome do arquivo precisa ter no máximo ${ATTACHMENT_FILE_NAME_MAX_LENGTH} caracteres.`,
  })
  .refine(isSafeAttachmentFileName, {
    error: ATTACHMENT_INVALID_FILE_NAME_MESSAGE,
  })
  .refine((fileName) => attachmentExtensionOf(fileName) !== null, {
    error: ATTACHMENT_TYPE_NOT_ALLOWED_MESSAGE,
  })

export const attachmentSizeSchema = z
  .number({ error: ATTACHMENT_EMPTY_MESSAGE })
  .int({ error: ATTACHMENT_EMPTY_MESSAGE })
  .min(1, { error: ATTACHMENT_EMPTY_MESSAGE })
  .max(ATTACHMENT_MAX_BYTES, { error: ATTACHMENT_TOO_LARGE_MESSAGE })

export const requestAttachmentUploadSchema = z.object({
  fileName: attachmentFileNameSchema,
  sizeBytes: attachmentSizeSchema,
})

export type RequestAttachmentUploadInput = z.infer<
  typeof requestAttachmentUploadSchema
>

export const uploadedAttachmentSchema = z
  .object({
    key: z
      .string({ error: ATTACHMENT_INVALID_REFERENCE_MESSAGE })
      .refine((key) => parsePendingAttachmentKey(key) !== null, {
        error: ATTACHMENT_INVALID_REFERENCE_MESSAGE,
      }),
    fileName: attachmentFileNameSchema,
  })
  .refine(
    ({ key, fileName }) =>
      parsePendingAttachmentKey(key)?.extension ===
      attachmentExtensionOf(fileName),
    { error: ATTACHMENT_INVALID_REFERENCE_MESSAGE, path: ["fileName"] },
  )

export type UploadedAttachmentInput = z.infer<typeof uploadedAttachmentSchema>

export const uploadedAttachmentsSchema = z
  .array(uploadedAttachmentSchema, {
    error: ATTACHMENT_INVALID_REFERENCE_MESSAGE,
  })
  .max(ATTACHMENT_MAX_FILES, { error: ATTACHMENT_TOO_MANY_MESSAGE })
  .refine(
    (attachments) =>
      new Set(attachments.map(({ key }) => key)).size === attachments.length,
    { error: ATTACHMENT_DUPLICATE_MESSAGE },
  )

export type UploadedAttachmentsInput = z.infer<typeof uploadedAttachmentsSchema>

const INVALID_ATTACHMENT_MESSAGE = "Anexo inválido."

export const attachmentIdParamSchema = idSearchParamSchema(
  INVALID_ATTACHMENT_MESSAGE,
)

export const parseAttachmentIdParam = (value: string): number | null => {
  const result = attachmentIdParamSchema.safeParse(value)
  return result.success ? result.data : null
}
