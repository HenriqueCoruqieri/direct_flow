import {
  NO_ATTACHMENTS_LABEL,
  TICKET_ATTACHMENTS_LABEL,
} from "@/app/_lib/domain/ticket"
import type { TicketAttachmentItem } from "@/app/_lib/types/attachment"

import TicketAttachmentTile from "./ticket-attachment-tile"

interface TicketAttachmentListProps {
  attachments: readonly TicketAttachmentItem[]
}

const HEADING_ID = "ticket-attachments-heading"

const TicketAttachmentList = ({ attachments }: TicketAttachmentListProps) => {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <h3 id={HEADING_ID} className="text-sm font-medium">
        {TICKET_ATTACHMENTS_LABEL}
      </h3>
      {attachments.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong px-3 py-4 text-center text-sm text-muted-foreground">
          {NO_ATTACHMENTS_LABEL}
        </p>
      ) : (
        <div className="-mx-1 min-w-0 scroll-p-1 overflow-x-auto p-1">
          <ul aria-labelledby={HEADING_ID} className="flex w-max gap-2">
            {attachments.map((attachment) => (
              <TicketAttachmentTile
                key={attachment.id}
                attachment={attachment}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default TicketAttachmentList
