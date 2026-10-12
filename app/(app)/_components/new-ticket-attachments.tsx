import { useId } from "react"

import { FieldTitle } from "@/app/_components/ui/field"
import {
  NO_ATTACHMENTS_LABEL,
  TICKET_ATTACHMENTS_LABEL,
} from "@/app/_lib/domain/ticket"

import AttachmentsSoonButton from "./attachments-soon-button"

const NewTicketAttachments = () => {
  const labelId = useId()

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className="flex flex-col gap-1.5"
    >
      <div className="flex items-center justify-between gap-2">
        <FieldTitle id={labelId}>{TICKET_ATTACHMENTS_LABEL}</FieldTitle>
        <AttachmentsSoonButton />
      </div>
      <p className="rounded-lg border border-dashed border-border-strong px-3 py-4 text-center text-sm text-muted-foreground">
        {NO_ATTACHMENTS_LABEL}
      </p>
    </div>
  )
}

export default NewTicketAttachments
