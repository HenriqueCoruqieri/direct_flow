import type { TicketVisibilityFacts } from "@/app/_lib/types/ticket"

export type AttachmentExtension =
  | "png"
  | "jpg"
  | "jpeg"
  | "webp"
  | "pdf"
  | "txt"
  | "csv"
  | "log"
  | "docx"
  | "xlsx"
  | "pptx"
  | "zip"
  | "rar"

export type AttachmentContentType =
  | "image/png"
  | "image/jpeg"
  | "image/webp"
  | "application/pdf"
  | "text/plain"
  | "text/csv"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  | "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  | "application/zip"
  | "application/vnd.rar"

export interface AttachmentByteSignature {
  offset: number
  bytes: readonly number[]
}

export interface AttachmentBinaryCheck {
  kind: "binary"
  signature: readonly AttachmentByteSignature[]
}

export interface AttachmentTextCheck {
  kind: "text"
}

export type AttachmentContentCheck = AttachmentBinaryCheck | AttachmentTextCheck

export interface AttachmentTypeSpec {
  contentType: AttachmentContentType
  check: AttachmentContentCheck
}

export interface AttachmentTypeMatch {
  extension: AttachmentExtension
  contentType: AttachmentContentType
}

export interface AttachmentUploadFile extends AttachmentTypeMatch {
  sizeBytes: number
}

export interface PendingAttachmentKeyParts {
  userId: number
  id: string
  extension: AttachmentExtension
}

export interface AttachmentUploadTarget {
  uploadUrl: string
  key: string
  contentType: AttachmentContentType
}

export type RequestAttachmentUploadErrorCode = "INVALID_INPUT" | "FORBIDDEN"

export interface RequestAttachmentUploadSuccess {
  ok: true
  upload: AttachmentUploadTarget
}

export interface RequestAttachmentUploadFailure {
  ok: false
  message: string
  code?: RequestAttachmentUploadErrorCode
}

export type RequestAttachmentUploadResult =
  RequestAttachmentUploadSuccess | RequestAttachmentUploadFailure

export interface UploadedAttachmentRef {
  key: string
  fileName: string
}

export type AttachmentUploadStatus = "uploading" | "uploaded" | "failed"

export interface AttachmentObjectHead {
  sizeBytes: number
  etag: string
}

export interface StoredAttachmentObject {
  storageKey: string
}

export interface StoredAttachmentValues {
  fileName: string
  mimeType: AttachmentContentType
  sizeBytes: number
  storageKey: string
}

export interface TicketAttachmentItem {
  id: number
  fileName: string
  sizeBytes: number
  uploadedByName: string
  createdAt: Date
}

export interface AttachmentDownloadTarget {
  id: number
  fileName: string
  storageKey: string
  ticket: TicketVisibilityFacts
}
