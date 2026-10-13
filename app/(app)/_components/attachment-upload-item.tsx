import {
  CircleAlertIcon,
  CircleCheckIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react"

import { Button } from "@/app/_components/ui/button"
import {
  ATTACHMENT_UPLOAD_STATUS_LABELS,
  formatAttachmentSize,
  removeAttachmentLabel,
} from "@/app/_lib/domain/attachment"
import type { AttachmentUploadStatus } from "@/app/_lib/types/attachment"
import { cn } from "@/app/_lib/utils"

interface AttachmentUploadItemProps {
  fileName: string
  sizeBytes: number
  status: AttachmentUploadStatus
  error: string | null
  disabled?: boolean
  onRemove: () => void
}

const STATUS_ICON_CLASS = "mt-0.5 size-4 shrink-0"

const AttachmentUploadItem = ({
  fileName,
  sizeBytes,
  status,
  error,
  disabled,
  onRemove,
}: AttachmentUploadItemProps) => {
  return (
    <li className="flex min-w-0 items-start gap-2.5 rounded-lg bg-surface-muted py-2 pr-1.5 pl-3">
      {status === "uploading" ? (
        <Loader2Icon
          aria-hidden="true"
          className={cn(
            STATUS_ICON_CLASS,
            "animate-spin text-muted-foreground motion-reduce:animate-none",
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
        <CircleAlertIcon
          aria-hidden="true"
          className={cn(STATUS_ICON_CLASS, "text-destructive")}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium wrap-break-word">{fileName}</span>
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
          <span className="tabular-nums">
            {formatAttachmentSize(sizeBytes)}
          </span>
          <span aria-hidden="true">·</span>
          <span className={cn(status === "failed" && "text-destructive")}>
            {ATTACHMENT_UPLOAD_STATUS_LABELS[status]}
          </span>
        </p>
        {error !== null ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : null}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={disabled}
        aria-label={removeAttachmentLabel(fileName)}
        onClick={onRemove}
        className="shrink-0"
      >
        <XIcon aria-hidden="true" className="size-3.5" />
      </Button>
    </li>
  )
}

export default AttachmentUploadItem
