import { DownloadIcon, XIcon } from "lucide-react"

import { Button } from "@/app/_components/ui/button"
import {
  attachmentDownloadPath,
  downloadAttachmentLabel,
  removeAttachmentLabel,
} from "@/app/_lib/domain/attachment"
import type { TicketAttachmentItem } from "@/app/_lib/types/attachment"

import AttachmentRowBody from "../../../_components/attachment-row-body"

interface TicketAttachmentRowProps {
  attachment: TicketAttachmentItem
  onRemove?: () => void
  disabled?: boolean
}

const TicketAttachmentRow = ({
  attachment,
  onRemove,
  disabled,
}: TicketAttachmentRowProps) => {
  const sizeId = `ticket-attachment-${attachment.id}-size`

  return (
    <li className="flex h-13 min-w-0 shrink-0 items-center gap-1">
      <a
        href={attachmentDownloadPath(attachment.id)}
        aria-label={downloadAttachmentLabel(attachment.fileName)}
        aria-describedby={sizeId}
        className="group/attachment flex h-full min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-transparent bg-surface-muted px-2.5 transition-colors outline-none hover:border-border-strong hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <AttachmentRowBody
          fileName={attachment.fileName}
          sizeBytes={attachment.sizeBytes}
          sizeId={sizeId}
        />
        <DownloadIcon
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-colors group-hover/attachment:text-foreground"
        />
      </a>
      {onRemove !== undefined ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          aria-label={removeAttachmentLabel(attachment.fileName)}
          onClick={onRemove}
          className="shrink-0"
        >
          <XIcon aria-hidden="true" className="size-3.5" />
        </Button>
      ) : null}
    </li>
  )
}

export default TicketAttachmentRow
