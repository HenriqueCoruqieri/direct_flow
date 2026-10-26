import { formatDateTime, formatTimeUntil, HOUR_MS } from "@/app/_lib/date"
import { EMPTY_VALUE_LABEL } from "@/app/_lib/domain/labels"
import { isActiveTicketStatus } from "@/app/_lib/domain/ticket"
import type { TicketPriority } from "@/app/_lib/types/ticket"
import type {
  TicketDueFacts,
  TicketRunningSla,
  TicketRunningSlaStatus,
  TicketSettledSlaStatus,
  TicketSla,
  TicketSlaCell,
  TicketSlaFacts,
} from "@/app/_lib/types/ticket-due"

export const TICKET_PRIORITY_DUE_HOURS = {
  critica: 3,
  alta: 6,
  media: 12,
  baixa: 24,
} satisfies Record<TicketPriority, number>

export const ticketDueWindowMs = (priority: TicketPriority): number =>
  TICKET_PRIORITY_DUE_HOURS[priority] * HOUR_MS

export const ticketDueAt = (facts: TicketDueFacts): Date =>
  new Date(facts.createdAt.getTime() + ticketDueWindowMs(facts.priority))

const isPastDue = (dueAt: Date, reference: Date): boolean =>
  dueAt.getTime() < reference.getTime()

export const isTicketOverdue = (facts: TicketDueFacts, now: Date): boolean =>
  isPastDue(ticketDueAt(facts), now)

export const TICKET_SLA_LABEL = "SLA"

export const TICKET_SLA_SETTLED_LABELS = {
  met: "No prazo",
  missed: "Fora do prazo",
} satisfies Record<TicketSettledSlaStatus, string>

export const TICKET_SLA_OVERDUE_LABEL = "Vencido"

export const ticketSlaFor = (facts: TicketSlaFacts, now: Date): TicketSla => {
  const dueAt = ticketDueAt(facts)
  if (isActiveTicketStatus(facts.status)) {
    return { status: isPastDue(dueAt, now) ? "overdue" : "on_time", dueAt }
  }
  if (facts.resolvedAt === null) return { status: "neutral", dueAt }
  return {
    status: isPastDue(dueAt, facts.resolvedAt) ? "missed" : "met",
    dueAt,
    resolvedAt: facts.resolvedAt,
  }
}

export const isTicketSlaOverdue = (sla: TicketSla): boolean =>
  sla.status === "overdue"

export const isTicketSlaRunning = (sla: TicketSla): sla is TicketRunningSla =>
  sla.status === "on_time" || sla.status === "overdue"

export const describeTicketSla = (sla: TicketSla): string => {
  if (isTicketSlaRunning(sla)) return formatDateTime(sla.dueAt)
  switch (sla.status) {
    case "met":
    case "missed":
      return TICKET_SLA_SETTLED_LABELS[sla.status]
    case "neutral":
      return EMPTY_VALUE_LABEL
  }
}

export const TICKET_SLA_RUNNING_LABELS = {
  on_time: "Expira em",
  overdue: "Expirado",
} satisfies Record<TicketRunningSlaStatus, string>

export const describeTicketSlaCell = (
  sla: TicketSla,
  now: Date,
): TicketSlaCell => {
  if (isTicketSlaRunning(sla)) {
    return {
      label: TICKET_SLA_RUNNING_LABELS[sla.status],
      value: formatTimeUntil(sla.dueAt, now),
    }
  }
  return { label: null, value: describeTicketSla(sla) }
}
