import {
  CircleAlertIcon,
  CircleCheckIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react"

import { Button } from "@/app/_components/ui/button"
import {
  ATTACHMENT_UPLOAD_STATUS_LABELS,
  describeAttachmentUploadStatus,
  removeAttachmentLabel,
} from "@/app/_lib/domain/attachment"
import type { AttachmentUploadStatus } from "@/app/_lib/types/attachment"
import { cn } from "@/app/_lib/utils"

import AttachmentRowBody from "./attachment-row-body"
import AttachmentTileBody from "./attachment-tile-body"

type AttachmentUploadItemLayout = "tile" | "row"

interface AttachmentUploadItemProps {
  fileName: string
  sizeBytes: number
  status: AttachmentUploadStatus
  error: string | null
  disabled?: boolean
  onRemove: () => void
  layout?: AttachmentUploadItemLayout
  className?: string
}

const STATUS_ICON_CLASS = "size-3.5 shrink-0"

const AttachmentUploadItem = ({
  fileName,
  sizeBytes,
  status,
  error,
  disabled,
  onRemove,
  layout = "tile",
  className,
}: AttachmentUploadItemProps) => {
  const isRow = layout === "row"
  const statusLabel = ATTACHMENT_UPLOAD_STATUS_LABELS[status]
  const statusTone =
    status === "failed" ? "text-destructive" : "text-muted-foreground"

  const statusIcon = (
    <>
      {status === "uploading" ? (
        <Loader2Icon
          aria-hidden="true"
          className={cn(
            STATUS_ICON_CLASS,
            "animate-spin motion-reduce:animate-none",
          )}
        />
      ) : null}
      {status === "uploaded" ? (
        <CircleCheckIcon
          aria-hidden="true"
          className={cn(STATUS_ICON_CLASS, "text-primary")}
        />
      ) : null}
      {status === "failed" ? (
        <CircleAlertIcon aria-hidden="true" className={STATUS_ICON_CLASS} />
      ) : null}
    </>
  )

  const statusDescription = (
    <span className="sr-only">
      {describeAttachmentUploadStatus(fileName, status)}
    </span>
  )

  const removeButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={disabled}
      aria-label={removeAttachmentLabel(fileName)}
      onClick={onRemove}
      className={isRow ? "shrink-0" : "absolute top-1 right-1"}
    >
      <XIcon aria-hidden="true" className="size-3.5" />
    </Button>
  )

  if (isRow) {
    const rowStatusText = error ?? statusLabel

    return (
      <li
        className={cn(
          "flex h-13 min-w-0 shrink-0 items-center gap-1",
          className,
        )}
      >
        <div className="flex h-full min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-transparent bg-surface-muted px-2.5">
          <AttachmentRowBody fileName={fileName} sizeBytes={sizeBytes}>
            <span aria-hidden="true" className="text-muted-foreground">
              ·
            </span>
            <span
              title={rowStatusText}
              className={cn("flex min-w-0 items-center gap-1", statusTone)}
            >
              {statusIcon}
              <span aria-hidden="true" className="truncate">
                {rowStatusText}
              </span>
              {statusDescription}
              {error !== null ? <span className="sr-only">{error}</span> : null}
            </span>
          </AttachmentRowBody>
        </div>
        {removeButton}
      </li>
    )
  }

  return (
    <li className={cn("min-w-0", className)}>
      <div className="relative flex h-full min-w-0 flex-col items-center gap-1 rounded-lg bg-surface-muted px-2 pt-3 pb-2.5 text-center">
        <AttachmentTileBody fileName={fileName} sizeBytes={sizeBytes} />
        <p
          className={cn(
            "flex max-w-full items-center justify-center gap-1 text-xs",
            statusTone,
          )}
        >
          {statusIcon}
          <span aria-hidden="true" className="min-w-0">
            {statusLabel}
          </span>
          {statusDescription}
        </p>
        {error !== null ? (
          <p className="w-full text-xs wrap-break-word text-destructive">
            {error}
          </p>
        ) : null}
        {removeButton}
      </div>
    </li>
  )
}

export default AttachmentUploadItem
