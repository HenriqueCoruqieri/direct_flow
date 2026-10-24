import Link from "next/link"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/_components/ui/table"
import { listOverdueTickets } from "@/app/_lib/data/dashboard"
import { formatDateTime, formatShortDateTime } from "@/app/_lib/date"
import {
  EMPTY_OVERDUE_DESCRIPTION,
  EMPTY_OVERDUE_TITLE,
  OVERDUE_COLUMN_LABELS,
  OVERDUE_TICKETS_LIMIT,
} from "@/app/_lib/domain/dashboard"
import {
  formatTicketNumber,
  TICKET_PRIORITY_LABELS,
} from "@/app/_lib/domain/ticket"
import type { PeriodSelection } from "@/app/_lib/types/period"
import type { TicketPriority } from "@/app/_lib/types/ticket"
import { cn } from "@/app/_lib/utils"
import { dashboardTicketDetailHref } from "@/app/_lib/validation/dashboard"

import DashboardOverdueHeader from "./dashboard-overdue-header"
import DashboardPanel from "./dashboard-panel"

const TITLE_ID = "dashboard-overdue-title"

const PRIORITY_TEXT_CLASSES = {
  baixa: "text-prioridade-baixa",
  media: "text-prioridade-media",
  alta: "text-prioridade-alta",
  critica: "text-prioridade-critica",
} satisfies Record<TicketPriority, string>

const HEAD_CLASS = "h-10 text-xs font-semibold text-muted-foreground"

interface DashboardOverdueProps {
  departmentId: number
  now: Date
  selection: PeriodSelection
}

const DashboardOverdue = async ({
  departmentId,
  now,
  selection,
}: DashboardOverdueProps) => {
  const tickets = await listOverdueTickets(
    departmentId,
    now,
    OVERDUE_TICKETS_LIMIT,
  )

  return (
    <DashboardPanel aria-labelledby={TITLE_ID} className="xl:col-span-2">
      <DashboardOverdueHeader titleId={TITLE_ID} />
      {tickets.length === 0 ? (
        <div className="mt-3 flex flex-col gap-1">
          <p className="text-sm font-semibold">{EMPTY_OVERDUE_TITLE}</p>
          <p className="text-caption text-muted-foreground">
            {EMPTY_OVERDUE_DESCRIPTION}
          </p>
        </div>
      ) : (
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
                <TableCell
                  className={cn(
                    "py-3 font-semibold",
                    PRIORITY_TEXT_CLASSES[ticket.priority],
                  )}
                >
                  {TICKET_PRIORITY_LABELS[ticket.priority]}
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
      )}
    </DashboardPanel>
  )
}

export default DashboardOverdue
