import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3ServiceException,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

import {
  ATTACHMENT_HEADER_BYTES,
  ATTACHMENT_UPLOAD_URL_TTL_SECONDS,
  isAttachmentStorageKey,
  parsePendingAttachmentKey,
  pendingAttachmentKey,
  storedAttachmentKey,
} from "@/app/_lib/domain/attachment"
import { r2Client, readStorageEnv } from "@/app/_lib/storage/client"
import type {
  AttachmentObjectHead,
  AttachmentTypeMatch,
  AttachmentUploadFile,
  AttachmentUploadTarget,
  StoredAttachmentObject,
} from "@/app/_lib/types/attachment"

const hasHttpStatus = (error: unknown, statuses: readonly number[]): boolean =>
  error instanceof S3ServiceException &&
  statuses.includes(error.$metadata.httpStatusCode ?? 0)

const requirePendingKey = (key: string) => {
  const parts = parsePendingAttachmentKey(key)

  if (!parts) {
    throw new Error("[storage] Chave de espera de anexo inválida.")
  }

  return parts
}

export async function createAttachmentUploadUrl(
  userId: number,
  file: AttachmentUploadFile,
): Promise<AttachmentUploadTarget> {
  const bucket = readStorageEnv("R2_ATTACHMENTS_BUCKET")
  const key = pendingAttachmentKey(userId, crypto.randomUUID(), file.extension)

  const uploadUrl = await getSignedUrl(
    r2Client(),
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: file.contentType,
      ContentLength: file.sizeBytes,
    }),
    {
      expiresIn: ATTACHMENT_UPLOAD_URL_TTL_SECONDS,
      signableHeaders: new Set(["content-type", "content-length"]),
    },
  )

  return { uploadUrl, key, contentType: file.contentType }
}

export async function headPendingAttachment(
  key: string,
): Promise<AttachmentObjectHead | null> {
  requirePendingKey(key)

  try {
    const head = await r2Client().send(
      new HeadObjectCommand({
        Bucket: readStorageEnv("R2_ATTACHMENTS_BUCKET"),
        Key: key,
      }),
    )

    if (head.ContentLength === undefined || !head.ETag) return null

    return { sizeBytes: head.ContentLength, etag: head.ETag }
  } catch (error) {
    if (hasHttpStatus(error, [404])) return null
    throw error
  }
}

export async function readPendingAttachmentHeader(
  key: string,
  etag: string,
): Promise<Uint8Array | null> {
  requirePendingKey(key)

  try {
    const object = await r2Client().send(
      new GetObjectCommand({
        Bucket: readStorageEnv("R2_ATTACHMENTS_BUCKET"),
        Key: key,
        Range: `bytes=0-${ATTACHMENT_HEADER_BYTES - 1}`,
        IfMatch: etag,
      }),
    )

    if (!object.Body) return null

    return await object.Body.transformToByteArray()
  } catch (error) {
    if (hasHttpStatus(error, [404, 412])) return null
    throw error
  }
}

export async function copyPendingAttachment(
  key: string,
  etag: string,
  type: AttachmentTypeMatch,
): Promise<StoredAttachmentObject | null> {
  const parts = requirePendingKey(key)

  if (parts.extension !== type.extension) {
    throw new Error("[storage] Extensão do anexo diferente da chave de espera.")
  }

  const bucket = readStorageEnv("R2_ATTACHMENTS_BUCKET")
  const storageKey = storedAttachmentKey(crypto.randomUUID(), type.extension)

  try {
    await r2Client().send(
      new CopyObjectCommand({
        Bucket: bucket,
        Key: storageKey,
        CopySource: `${bucket}/${key}`,
        CopySourceIfMatch: etag,
        MetadataDirective: "REPLACE",
        ContentType: type.contentType,
      }),
    )
  } catch (error) {
    if (hasHttpStatus(error, [404, 412])) return null
    throw error
  }

  return { storageKey }
}

export async function deleteAttachmentObject(key: string): Promise<void> {
  if (!isAttachmentStorageKey(key)) return

  await r2Client().send(
    new DeleteObjectCommand({
      Bucket: readStorageEnv("R2_ATTACHMENTS_BUCKET"),
      Key: key,
    }),
  )
}
