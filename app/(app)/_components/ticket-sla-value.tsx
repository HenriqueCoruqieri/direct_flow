import { toISO } from "@/app/_lib/date"
import {
  describeTicketSla,
  isTicketSlaOverdue,
  isTicketSlaRunning,
  TICKET_SLA_OVERDUE_LABEL,
  ticketSlaFor,
} from "@/app/_lib/domain/ticket-due"
import type { TicketSlaFacts } from "@/app/_lib/types/ticket-due"
import { cn } from "@/app/_lib/utils"

interface TicketSlaValueProps {
  facts: TicketSlaFacts
  now: Date
}

const TicketSlaValue = ({ facts, now }: TicketSlaValueProps) => {
  const sla = ticketSlaFor(facts, now)
  const overdue = isTicketSlaOverdue(sla)
  const text = describeTicketSla(sla)

  return (
    <span
      className={cn(
        "whitespace-nowrap tabular-nums",
        overdue && "text-destructive",
      )}
    >
      {overdue ? (
        <span className="sr-only">{`${TICKET_SLA_OVERDUE_LABEL} `}</span>
      ) : null}
      {isTicketSlaRunning(sla) ? (
        <time dateTime={toISO(sla.dueAt)}>{text}</time>
      ) : (
        text
      )}
    </span>
  )
}

export default TicketSlaValue
