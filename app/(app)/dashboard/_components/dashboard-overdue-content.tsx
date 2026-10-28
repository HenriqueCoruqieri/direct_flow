import Link from "next/link"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/_components/ui/table"
import { formatDateTime, formatShortDateTime } from "@/app/_lib/date"
import {
  EMPTY_OVERDUE_COPY,
  OVERDUE_COLUMN_LABELS,
} from "@/app/_lib/domain/dashboard"
import { formatTicketNumber } from "@/app/_lib/domain/ticket"
import type {
  DashboardOverdueTicket,
  DashboardViewMode,
} from "@/app/_lib/types/dashboard"
import type { PeriodSelection } from "@/app/_lib/types/period"
import { cn } from "@/app/_lib/utils"
import { dashboardTicketDetailHref } from "@/app/_lib/validation/dashboard"

import TicketPriorityText from "../../_components/ticket-priority-text"

const HEAD_CLASS = "h-10 text-xs font-semibold text-muted-foreground"

interface DashboardOverdueContentProps {
  tickets: DashboardOverdueTicket[]
  mode: DashboardViewMode
  now: Date
  selection: PeriodSelection
}

const DashboardOverdueContent = ({
  tickets,
  mode,
  now,
  selection,
}: DashboardOverdueContentProps) => {
  if (tickets.length === 0) {
    const emptyCopy = EMPTY_OVERDUE_COPY[mode]

    return (
      <div className="mt-3 flex flex-col gap-1">
        <p className="text-sm font-semibold">{emptyCopy.title}</p>
        <p className="text-caption text-muted-foreground">
          {emptyCopy.description}
        </p>
      </div>
    )
  }

  return (
    <Table className="mt-3">
      <TableHeader>
        <TableRow className="border-border-subtle hover:bg-transparent">
          <TableHead className={cn(HEAD_CLASS, "pl-0")}>
            {OVERDUE_COLUMN_LABELS.number}
          </TableHead>
          <TableHead className={HEAD_CLASS}>
            {OVERDUE_COLUMN_LABELS.title}
          </TableHead>
          <TableHead className={HEAD_CLASS}>
            {OVERDUE_COLUMN_LABELS.priority}
          </TableHead>
          <TableHead className={cn(HEAD_CLASS, "pr-0")}>
            {OVERDUE_COLUMN_LABELS.dueAt}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.map((ticket) => (
          <TableRow key={ticket.id} className="border-border-subtle">
            <TableCell className="py-3 pl-0">
              <Link
                href={dashboardTicketDetailHref(selection, ticket.id)}
                className="rounded-sm font-mono text-xs text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {formatTicketNumber(ticket.id)}
              </Link>
            </TableCell>
            <TableCell
              title={ticket.title}
              className="w-full max-w-0 truncate py-3"
            >
              {ticket.title}
            </TableCell>
            <TableCell className="py-3">
              <TicketPriorityText priority={ticket.priority} />
            </TableCell>
            <TableCell
              title={formatDateTime(ticket.dueAt)}
              className="py-3 pr-0 text-text-secondary tabular-nums"
            >
              {formatShortDateTime(ticket.dueAt, now)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default DashboardOverdueContent
