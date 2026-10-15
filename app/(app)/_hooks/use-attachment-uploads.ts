import { useEffect, useId, useRef, useState } from "react"
import { toast } from "sonner"

import { requestAttachmentUpload } from "@/app/_lib/actions/attachments"
import {
  ATTACHMENT_CONTENT_MISMATCH_MESSAGE,
  ATTACHMENT_HEADER_BYTES,
  ATTACHMENT_MAX_FILES,
  ATTACHMENT_TOO_MANY_MESSAGE,
  ATTACHMENT_TYPE_NOT_ALLOWED_MESSAGE,
  ATTACHMENT_UPLOAD_FAILED_MESSAGE,
  ATTACHMENT_UPLOADS_FAILED_MESSAGE,
  ATTACHMENT_UPLOADS_IN_PROGRESS_MESSAGE,
  describeRejectedAttachment,
  detectAttachmentType,
} from "@/app/_lib/domain/attachment"
import type {
  AttachmentUploadStatus,
  UploadedAttachmentRef,
} from "@/app/_lib/types/attachment"
import { requestAttachmentUploadSchema } from "@/app/_lib/validation/attachment"

export type AttachmentUploaderBusy = "idle" | "uploading" | "failed"

const BLOCK_MESSAGES = {
  uploading: ATTACHMENT_UPLOADS_IN_PROGRESS_MESSAGE,
  failed: ATTACHMENT_UPLOADS_FAILED_MESSAGE,
} satisfies Record<Exclude<AttachmentUploaderBusy, "idle">, string>

export const attachmentUploadsBlockMessage = (
  busy: AttachmentUploaderBusy,
): string | null => (busy === "idle" ? null : BLOCK_MESSAGES[busy])

export interface AttachmentUploadEntry {
  id: number
  file: File
  status: AttachmentUploadStatus
  uploaded: UploadedAttachmentRef | null
  error: string | null
}

interface UseAttachmentUploadsOptions {
  onChange: (value: UploadedAttachmentRef[]) => void
  onBusyChange: (busy: AttachmentUploaderBusy) => void
  maxFiles?: number
  tooManyMessage?: string
}

export interface AttachmentUploadsControls {
  items: AttachmentUploadEntry[]
  addFiles: (files: readonly File[]) => Promise<void>
  remove: (id: number) => void
}

const busyOf = (
  items: readonly AttachmentUploadEntry[],
): AttachmentUploaderBusy => {
  if (items.some((item) => item.status === "uploading")) return "uploading"
  if (items.some((item) => item.status === "failed")) return "failed"
  return "idle"
}

const uploadedRefsOf = (
  items: readonly AttachmentUploadEntry[],
): UploadedAttachmentRef[] =>
  items.flatMap((item) => (item.uploaded === null ? [] : [item.uploaded]))

const readHeader = async (file: File): Promise<Uint8Array> => {
  try {
    return new Uint8Array(
      await file.slice(0, ATTACHMENT_HEADER_BYTES).arrayBuffer(),
    )
  } catch {
    return new Uint8Array()
  }
}

const rejectionOf = async (file: File): Promise<string | null> => {
  const parsed = requestAttachmentUploadSchema.safeParse({
    fileName: file.name,
    sizeBytes: file.size,
  })
  if (!parsed.success) {
    return (
      parsed.error.issues[0]?.message ?? ATTACHMENT_TYPE_NOT_ALLOWED_MESSAGE
    )
  }

  const header = await readHeader(file)
  return detectAttachmentType(parsed.data.fileName, header) === null
    ? ATTACHMENT_CONTENT_MISMATCH_MESSAGE
    : null
}

export const useAttachmentUploads = ({
  onChange,
  onBusyChange,
  maxFiles = ATTACHMENT_MAX_FILES,
  tooManyMessage = ATTACHMENT_TOO_MANY_MESSAGE,
}: UseAttachmentUploadsOptions): AttachmentUploadsControls => {
  const tooManyToastId = useId()
  const [items, setItems] = useState<AttachmentUploadEntry[]>([])
  const itemsRef = useRef<AttachmentUploadEntry[]>([])
  const controllersRef = useRef(new Map<number, AbortController>())
  const nextIdRef = useRef(0)
  const disposedRef = useRef(false)

  useEffect(() => {
    const controllers = controllersRef.current
    disposedRef.current = false

    return () => {
      disposedRef.current = true
      controllers.forEach((controller) => controller.abort())
      controllers.clear()
    }
  }, [])

  const commit = (next: AttachmentUploadEntry[]) => {
    itemsRef.current = next
    setItems(next)
    onChange(uploadedRefsOf(next))
    onBusyChange(busyOf(next))
  }

  const settle = (
    id: number,
    changes: Pick<AttachmentUploadEntry, "status" | "uploaded" | "error">,
  ) => {
    controllersRef.current.delete(id)
    commit(
      itemsRef.current.map((item) =>
        item.id === id ? { ...item, ...changes } : item,
      ),
    )
  }

  const fail = (id: number, message: string) =>
    settle(id, { status: "failed", uploaded: null, error: message })

  const upload = async (id: number, file: File, signal: AbortSignal) => {
    try {
      const result = await requestAttachmentUpload({
        fileName: file.name,
        sizeBytes: file.size,
      })
      if (signal.aborted) return
      if (!result.ok) {
        fail(id, result.message)
        return
      }

      const response = await fetch(result.upload.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": result.upload.contentType },
        signal,
      })
      if (signal.aborted) return
      if (response.ok) {
        settle(id, {
          status: "uploaded",
          uploaded: { key: result.upload.key, fileName: file.name },
          error: null,
        })
        return
      }
    } catch {
      if (signal.aborted) return
    }

    fail(id, ATTACHMENT_UPLOAD_FAILED_MESSAGE)
  }

  const start = (file: File) => {
    const id = nextIdRef.current
    nextIdRef.current += 1

    const controller = new AbortController()
    controllersRef.current.set(id, controller)

    commit([
      ...itemsRef.current,
      { id, file, status: "uploading", uploaded: null, error: null },
    ])

    void upload(id, file, controller.signal)
  }

  const hasRoom = () => itemsRef.current.length < maxFiles

  const addFiles = async (files: readonly File[]) => {
    let refusedForLimit = false

    for (const file of files) {
      if (!hasRoom()) {
        refusedForLimit = true
        continue
      }

      const rejection = await rejectionOf(file)
      if (disposedRef.current) return

      if (rejection !== null) {
        toast.error(describeRejectedAttachment(file.name, rejection))
        continue
      }

      if (!hasRoom()) {
        refusedForLimit = true
        continue
      }

      start(file)
    }

    if (refusedForLimit) {
      toast.error(tooManyMessage, { id: tooManyToastId })
    }
  }

  const remove = (id: number) => {
    controllersRef.current.get(id)?.abort()
    controllersRef.current.delete(id)
    commit(itemsRef.current.filter((item) => item.id !== id))
  }

  return { items, addFiles, remove }
}
