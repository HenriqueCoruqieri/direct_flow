import { FileIcon } from "lucide-react"

import { formatDateTime, toISO } from "@/app/_lib/date"
import {
  attachmentDownloadPath,
  downloadAttachmentLabel,
  formatAttachmentSize,
} from "@/app/_lib/domain/attachment"
import {
  NO_ATTACHMENTS_LABEL,
  TICKET_ATTACHMENTS_LABEL,
} from "@/app/_lib/domain/ticket"
import type { TicketAttachmentItem } from "@/app/_lib/types/attachment"

const HEADING_ID = "ticket-attachments-heading"

interface TicketAttachmentsProps {
  attachments: TicketAttachmentItem[]
}

const TicketAttachments = ({ attachments }: TicketAttachmentsProps) => {
  return (
    <section
      aria-labelledby={HEADING_ID}
      className="flex min-w-0 flex-col gap-4 rounded-xl border border-border-subtle bg-surface p-5"
    >
      <h2 id={HEADING_ID} className="font-heading text-base font-semibold">
        {TICKET_ATTACHMENTS_LABEL}
      </h2>

      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">{NO_ATTACHMENTS_LABEL}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="flex min-w-0 items-start gap-2.5 rounded-lg bg-surface-muted px-3 py-2.5"
            >
              <FileIcon
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <a
                  href={attachmentDownloadPath(attachment.id)}
                  aria-label={downloadAttachmentLabel(attachment.fileName)}
                  className="w-fit max-w-full rounded-sm text-sm font-semibold wrap-break-word text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {attachment.fileName}
                </a>
                <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="tabular-nums">
                    {formatAttachmentSize(attachment.sizeBytes)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="wrap-break-word">
                    {attachment.uploadedByName}
                  </span>
                  <span aria-hidden="true">·</span>
                  <time
                    dateTime={toISO(attachment.createdAt)}
                    className="tabular-nums"
                  >
                    {formatDateTime(attachment.createdAt)}
                  </time>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default TicketAttachments
