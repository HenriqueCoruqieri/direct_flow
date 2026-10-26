import { formatDateTime, toISO } from "@/app/_lib/date"
import {
  describeTicketSlaCell,
  isTicketSlaOverdue,
  isTicketSlaRunning,
  ticketSlaFor,
} from "@/app/_lib/domain/ticket-due"
import type { TicketSlaFacts } from "@/app/_lib/types/ticket-due"
import { cn } from "@/app/_lib/utils"

interface TicketSlaCellProps {
  facts: TicketSlaFacts
  now: Date
}

const TicketSlaCell = ({ facts, now }: TicketSlaCellProps) => {
  const sla = ticketSlaFor(facts, now)
  const overdue = isTicketSlaOverdue(sla)
  const { label, value } = describeTicketSlaCell(sla, now)

  return (
    <span
      className={cn(
        "flex flex-col whitespace-nowrap tabular-nums",
        overdue && "text-destructive",
      )}
    >
      {label === null ? null : (
        <span className={cn("text-xs", !overdue && "text-muted-foreground")}>
          {label}
        </span>
      )}
      {isTicketSlaRunning(sla) ? (
        <time dateTime={toISO(sla.dueAt)} title={formatDateTime(sla.dueAt)}>
          {value}
        </time>
      ) : (
        value
      )}
    </span>
  )
}

export default TicketSlaCell
