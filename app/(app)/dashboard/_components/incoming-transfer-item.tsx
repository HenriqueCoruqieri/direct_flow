import Link from "next/link"

import { formatDateTime, formatElapsed } from "@/app/_lib/date"
import {
  incomingTransferOriginLabel,
  isStaleIncomingTransfer,
  STALE_INCOMING_TRANSFER_LABEL,
} from "@/app/_lib/domain/dashboard"
import { formatTicketNumber } from "@/app/_lib/domain/ticket"
import type { DashboardIncomingTransfer } from "@/app/_lib/types/dashboard"
import type { PeriodSelection } from "@/app/_lib/types/period"
import { cn } from "@/app/_lib/utils"
import { dashboardTicketDetailHref } from "@/app/_lib/validation/dashboard"

interface IncomingTransferItemProps {
  transfer: DashboardIncomingTransfer
  now: Date
  selection: PeriodSelection
}

const IncomingTransferItem = ({
  transfer,
  now,
  selection,
}: IncomingTransferItemProps) => {
  const stale = isStaleIncomingTransfer(transfer.sentAt, now)

  return (
    <li className="border-b border-border-subtle last:border-0">
      <Link
        href={dashboardTicketDetailHref(selection, transfer.ticketId)}
        title={transfer.ticketTitle}
        className="flex min-w-0 items-center justify-between gap-3 rounded-sm py-2.5 text-sm transition-colors outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="shrink-0 font-mono text-xs text-muted-foreground">
            {formatTicketNumber(transfer.ticketId)}
          </span>
          <span className="truncate">
            {incomingTransferOriginLabel(transfer.fromDepartmentName)}
          </span>
        </span>
        <span
          title={formatDateTime(transfer.sentAt)}
          className={cn(
            "shrink-0 whitespace-nowrap tabular-nums",
            stale
              ? "font-semibold text-warning-foreground"
              : "text-text-secondary",
          )}
        >
          {formatElapsed(transfer.sentAt, now)}
          {stale ? (
            <span className="sr-only">{`, ${STALE_INCOMING_TRANSFER_LABEL}`}</span>
          ) : null}
        </span>
      </Link>
    </li>
  )
}

export default IncomingTransferItem
