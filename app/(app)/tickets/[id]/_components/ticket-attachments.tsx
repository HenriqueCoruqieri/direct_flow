import type { TicketAttachmentItem } from "@/app/_lib/types/attachment"

import TicketAttachmentList from "./ticket-attachment-list"
import TicketEditAttachments from "./ticket-edit-attachments"

interface TicketAttachmentsProps {
  attachments: readonly TicketAttachmentItem[]
  editable?: boolean
  canAttach?: boolean
}

const TicketAttachments = ({
  attachments,
  editable = false,
  canAttach = false,
}: TicketAttachmentsProps) => {
  if (editable && canAttach) {
    return <TicketEditAttachments attachments={attachments} />
  }

  return <TicketAttachmentList attachments={attachments} />
}

export default TicketAttachments
