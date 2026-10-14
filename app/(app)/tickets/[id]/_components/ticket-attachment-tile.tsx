import {
  attachmentDownloadPath,
  downloadAttachmentLabel,
  formatAttachmentSize,
} from "@/app/_lib/domain/attachment"
import type { TicketAttachmentItem } from "@/app/_lib/types/attachment"

import AttachmentKindIcon from "../../../_components/attachment-kind-icon"

interface TicketAttachmentTileProps {
  attachment: TicketAttachmentItem
}

const TicketAttachmentTile = ({ attachment }: TicketAttachmentTileProps) => {
  const sizeId = `ticket-attachment-${attachment.id}-size`

  return (
    <li className="w-34 shrink-0">
      <a
        href={attachmentDownloadPath(attachment.id)}
        aria-label={downloadAttachmentLabel(attachment.fileName)}
        aria-describedby={sizeId}
        className="flex h-full flex-col items-center gap-1 rounded-lg border border-transparent bg-surface-muted px-2 pt-3 pb-2.5 text-center transition-colors outline-none hover:border-border-strong hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <AttachmentKindIcon fileName={attachment.fileName} />
        <span
          title={attachment.fileName}
          className="line-clamp-2 w-full text-xs font-medium wrap-anywhere"
        >
          {attachment.fileName}
        </span>
        <span
          id={sizeId}
          className="text-xs text-muted-foreground tabular-nums"
        >
          {formatAttachmentSize(attachment.sizeBytes)}
        </span>
      </a>
    </li>
  )
}

export default TicketAttachmentTile
