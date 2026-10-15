import { XIcon } from "lucide-react"

import { Button } from "@/app/_components/ui/button"
import {
  attachmentDownloadPath,
  downloadAttachmentLabel,
  removeAttachmentLabel,
} from "@/app/_lib/domain/attachment"
import type { TicketAttachmentItem } from "@/app/_lib/types/attachment"

import AttachmentTileBody from "../../../_components/attachment-tile-body"

interface TicketAttachmentTileProps {
  attachment: TicketAttachmentItem
  onRemove?: () => void
  disabled?: boolean
}

const TicketAttachmentTile = ({
  attachment,
  onRemove,
  disabled,
}: TicketAttachmentTileProps) => {
  const sizeId = `ticket-attachment-${attachment.id}-size`

  return (
    <li className="relative w-34 shrink-0">
      <a
        href={attachmentDownloadPath(attachment.id)}
        aria-label={downloadAttachmentLabel(attachment.fileName)}
        aria-describedby={sizeId}
        className="flex h-full flex-col items-center gap-1 rounded-lg border border-transparent bg-surface-muted px-2 pt-3 pb-2.5 text-center transition-colors outline-none hover:border-border-strong hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <AttachmentTileBody
          fileName={attachment.fileName}
          sizeBytes={attachment.sizeBytes}
          sizeId={sizeId}
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
          className="absolute top-1 right-1"
        >
          <XIcon aria-hidden="true" className="size-3.5" />
        </Button>
      ) : null}
    </li>
  )
}

export default TicketAttachmentTile
