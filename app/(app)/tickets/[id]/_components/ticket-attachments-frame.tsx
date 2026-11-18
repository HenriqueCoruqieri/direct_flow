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
  const heading = (
    <h2 id={HEADING_ID} className="font-heading text-base font-semibold">
      {TICKET_ATTACHMENTS_LABEL}
    </h2>
  )

  return (
    <section
      aria-labelledby={HEADING_ID}
      aria-describedby={describedBy}
      className="flex min-w-0 flex-col gap-3 rounded-xl border border-border-subtle bg-surface p-5"
    >
      {action === undefined ? (
        heading
      ) : (
        <div className="flex min-w-0 items-center justify-between gap-2">
          {heading}
          <div className="shrink-0">{action}</div>
        </div>
      )}
      {details !== undefined ? (
        <div className="flex min-w-0 flex-col gap-1">{details}</div>
      ) : null}
      <div aria-live={announceChanges ? "polite" : undefined}>
        {isEmpty ? (
          <AttachmentsEmpty />
        ) : (
          <ul
            ref={listRef}
            aria-labelledby={HEADING_ID}
            className="-m-1 flex max-h-44 min-w-0 scroll-py-1 flex-col gap-1.5 overflow-y-auto overscroll-contain p-1"
          >
            {children}
          </ul>
        )}
      </div>
      {footer}
    </section>
  )
}

export default TicketAttachmentsFrame
