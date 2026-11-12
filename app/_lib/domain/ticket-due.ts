import {
  formatDateDashTime,
  formatDateTime,
  formatTimeUntil,
} from "@/app/_lib/date"
import { EMPTY_VALUE_LABEL } from "@/app/_lib/domain/labels"
import {
  AWAITING_APPROVAL_TICKET_STATUS,
  isActiveTicketStatus,
} from "@/app/_lib/domain/ticket"
import type {
  TicketPausedSlaStatus,
  TicketRunningSla,
  TicketRunningSlaStatus,
  TicketSettledSlaStatus,
  TicketSla,
  TicketSlaCell,
  TicketSlaDetail,
  TicketSlaFacts,
} from "@/app/_lib/types/ticket-due"

const isPastDue = (dueAt: Date, reference: Date): boolean =>
  dueAt.getTime() < reference.getTime()

export const TICKET_SLA_LABEL = "SLA"

export const TICKET_SLA_SETTLED_LABELS = {
  met: "No prazo",
  missed: "Fora do prazo",
} satisfies Record<TicketSettledSlaStatus, string>

export const TICKET_SLA_PAUSED_LABELS = {
  awaiting_acceptance: "Aguardando aceite",
  neutral: EMPTY_VALUE_LABEL,
} satisfies Record<TicketPausedSlaStatus, string>

export const TICKET_SLA_OVERDUE_LABEL = "Vencido"

export const ticketSlaFor = (facts: TicketSlaFacts, now: Date): TicketSla => {
  if (facts.status === AWAITING_APPROVAL_TICKET_STATUS) {
    return { status: "awaiting_acceptance" }
  }
  const { dueAt } = facts
  if (dueAt === null) return { status: "neutral" }
  if (isActiveTicketStatus(facts.status)) {
    return { status: isPastDue(dueAt, now) ? "overdue" : "on_time", dueAt }
  }
  if (facts.resolvedAt === null) return { status: "neutral" }
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
    case "awaiting_acceptance":
    case "neutral":
      return TICKET_SLA_PAUSED_LABELS[sla.status]
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

export const TICKET_SLA_DETAIL_RUNNING_LABELS = {
  on_time: "Vence em",
  overdue: "Vencido em",
} satisfies Record<TicketRunningSlaStatus, string>

export const describeTicketSlaDetail = (sla: TicketSla): TicketSlaDetail => {
  if (isTicketSlaRunning(sla)) {
    return {
      status: sla.status,
      label: TICKET_SLA_DETAIL_RUNNING_LABELS[sla.status],
      value: formatDateDashTime(sla.dueAt),
      dueAt: sla.dueAt,
    }
  }
  return {
    status: sla.status,
    label: TICKET_SLA_LABEL,
    value: describeTicketSla(sla),
  }
}
