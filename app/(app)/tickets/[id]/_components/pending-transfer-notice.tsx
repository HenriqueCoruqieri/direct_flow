import { HourglassIcon } from "lucide-react"

import { formatDateTime, toISO } from "@/app/_lib/date"
import { describePendingTransfer } from "@/app/_lib/domain/ticket"
import type { TicketPendingTransfer } from "@/app/_lib/types/ticket"

interface PendingTransferNoticeProps {
  transfer: TicketPendingTransfer
}

const PendingTransferNotice = ({ transfer }: PendingTransferNoticeProps) => {
  return (
    <section className="flex gap-3 rounded-xl border border-warning-border bg-warning p-4 text-warning-foreground">
      <HourglassIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-sm font-bold">
          {describePendingTransfer(transfer)}
        </h2>
        <p className="text-caption">
          Solicitada por {transfer.requestedByName} em{" "}
          <time dateTime={toISO(transfer.requestedAt)} className="tabular-nums">
            {formatDateTime(transfer.requestedAt)}
          </time>
        </p>
        {transfer.requestReason !== null ? (
          <p className="mt-1 text-sm wrap-break-word whitespace-pre-wrap">
            {transfer.requestReason}
          </p>
        ) : null}
      </div>
    </section>
  )
}

export default PendingTransferNotice
