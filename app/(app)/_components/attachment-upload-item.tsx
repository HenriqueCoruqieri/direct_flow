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
  formatAttachmentSize,
  removeAttachmentLabel,
} from "@/app/_lib/domain/attachment"
import type { AttachmentUploadStatus } from "@/app/_lib/types/attachment"
import { cn } from "@/app/_lib/utils"

import AttachmentKindIcon from "./attachment-kind-icon"

interface AttachmentUploadItemProps {
  fileName: string
  sizeBytes: number
  status: AttachmentUploadStatus
  error: string | null
  disabled?: boolean
  onRemove: () => void
}

const STATUS_ICON_CLASS = "size-3.5 shrink-0"

const AttachmentUploadItem = ({
  fileName,
  sizeBytes,
  status,
  error,
  disabled,
  onRemove,
}: AttachmentUploadItemProps) => {
  return (
    <li className="min-w-0">
      <div className="relative flex h-full min-w-0 flex-col items-center gap-1 rounded-lg bg-surface-muted px-2 pt-3 pb-2.5 text-center">
        <AttachmentKindIcon fileName={fileName} />
        <span
          title={fileName}
          className="line-clamp-2 w-full text-xs font-medium wrap-anywhere"
        >
          {fileName}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatAttachmentSize(sizeBytes)}
        </span>
        <p
          className={cn(
            "flex max-w-full items-center justify-center gap-1 text-xs",
            status === "failed" ? "text-destructive" : "text-muted-foreground",
          )}
        >
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
          <span aria-hidden="true" className="min-w-0">
            {ATTACHMENT_UPLOAD_STATUS_LABELS[status]}
          </span>
          <span className="sr-only">
            {describeAttachmentUploadStatus(fileName, status)}
          </span>
        </p>
        {error !== null ? (
          <p className="w-full text-xs wrap-break-word text-destructive">
            {error}
          </p>
        ) : null}

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          aria-label={removeAttachmentLabel(fileName)}
          onClick={onRemove}
          className="absolute top-1 right-1"
        >
          <XIcon aria-hidden="true" className="size-3.5" />
        </Button>
      </div>
    </li>
  )
}

export default AttachmentUploadItem
