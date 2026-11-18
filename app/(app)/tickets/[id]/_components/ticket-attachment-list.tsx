import type { TicketAttachmentItem } from "@/app/_lib/types/attachment"

import TicketAttachmentRow from "./ticket-attachment-row"
import TicketAttachmentsFrame from "./ticket-attachments-frame"

interface TicketAttachmentListProps {
  attachments: readonly TicketAttachmentItem[]
}

const TicketAttachmentList = ({ attachments }: TicketAttachmentListProps) => {
  return (
    <TicketAttachmentsFrame isEmpty={attachments.length === 0}>
      {attachments.map((attachment) => (
        <TicketAttachmentRow key={attachment.id} attachment={attachment} />
      ))}
    </TicketAttachmentsFrame>
  )
}

export default TicketAttachmentList
