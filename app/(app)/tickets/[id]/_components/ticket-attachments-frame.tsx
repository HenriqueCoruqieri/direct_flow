import { TICKET_ATTACHMENTS_LABEL } from "@/app/_lib/domain/ticket"

import AttachmentsEmpty from "../../../_components/attachments-empty"

interface TicketAttachmentsFrameProps {
  isEmpty: boolean
  children: React.ReactNode
  details?: React.ReactNode
  action?: React.ReactNode
  footer?: React.ReactNode
  describedBy?: string
  announceChanges?: boolean
  listRef?: React.Ref<HTMLUListElement>
}

const HEADING_ID = "ticket-attachments-heading"

const TicketAttachmentsFrame = ({
  isEmpty,
  children,
  details,
  action,
  footer,
  describedBy,
  announceChanges = false,
  listRef,
}: TicketAttachmentsFrameProps) => {
  const isGroup = describedBy !== undefined
  const heading = (
    <h3 id={HEADING_ID} className="text-sm font-medium">
      {TICKET_ATTACHMENTS_LABEL}
    </h3>
  )

  return (
    <div
      role={isGroup ? "group" : undefined}
      aria-labelledby={isGroup ? HEADING_ID : undefined}
      aria-describedby={describedBy}
      className="flex min-w-0 flex-col gap-1.5"
    >
      {details === undefined ? (
        heading
      ) : (
        <div className="flex min-w-0 flex-col gap-0.5">
          {heading}
          {details}
        </div>
      )}
      <div aria-live={announceChanges ? "polite" : undefined}>
        {isEmpty ? (
          <AttachmentsEmpty />
        ) : (
          <div className="-mx-1 min-w-0 scroll-p-1 overflow-x-auto p-1">
            <ul
              ref={listRef}
              aria-labelledby={HEADING_ID}
              className="flex w-max gap-2"
            >
              {children}
            </ul>
          </div>
        )}
      </div>
      {action !== undefined ? <div className="pt-1">{action}</div> : null}
      {footer}
    </div>
  )
}

export default TicketAttachmentsFrame
