import {
  formatDuration,
  formatTotalHours,
  HOUR_MS,
  MINUTE_MS,
} from "@/app/_lib/date"
import { DEPARTMENT_QUEUE_OPEN_STATUSES } from "@/app/_lib/domain/department-queue"
import {
  type ActiveTicketStatus,
  CLOSED_TICKET_STATUS,
  RESOLVED_TICKET_STATUS,
} from "@/app/_lib/domain/ticket"
import type { DashboardOverviewCard } from "@/app/_lib/types/dashboard"
import type { TicketStatus } from "@/app/_lib/types/ticket"

export const DASHBOARD_PATH = "/dashboard"

export const DASHBOARD_OVERVIEW_LABELS = {
  ticketCount: "Chamados no período",
  resolutionRate: "Taxa de resolução",
  averageResolution: "Tempo médio de resolução",
  backlog: "Backlog",
} satisfies Record<DashboardOverviewCard, string>

export const DASHBOARD_RESOLVED_STATUSES: readonly TicketStatus[] = [
  RESOLVED_TICKET_STATUS,
  CLOSED_TICKET_STATUS,
]

export const BACKLOG_TICKET_STATUSES: readonly ActiveTicketStatus[] =
  DEPARTMENT_QUEUE_OPEN_STATUSES

export const NO_TICKETS_IN_PERIOD_HINT = "Nenhum chamado no período"

export const NO_RESOLUTIONS_IN_PERIOD_HINT =
  "Nenhum chamado resolvido no período"

export const EMPTY_BACKLOG_HINT = "Nenhum chamado em backlog"

export const receivedTransfersHint = (count: number): string => {
  if (count <= 0) return "Nenhum recebido de outros setores"
  return `+${count} ${count === 1 ? "recebido" : "recebidos"} de outros setores`
}

export const resolutionRatePercent = (
  resolvedCount: number,
  ticketCount: number,
): number | null => {
  if (ticketCount <= 0) return null
  const resolved = Math.min(Math.max(resolvedCount, 0), ticketCount)
  return Math.floor((resolved / ticketCount) * 100)
}

export const formatResolutionRate = (percent: number): string => `${percent}%`

export const ILLUSTRATIVE_LABEL = "Ilustrativo"

export const ILLUSTRATIVE_DESCRIPTION =
  "Valor de exemplo: o sistema ainda não mede este dado."

export const ILLUSTRATIVE_FIRST_RESPONSE_MS = 22 * MINUTE_MS

export const ILLUSTRATIVE_HANDLING_TIME_MS = 2 * HOUR_MS

export const firstResponseHint = (): string =>
  `1ª resposta em ${formatDuration(ILLUSTRATIVE_FIRST_RESPONSE_MS)}`

export const illustrativeBacklogMs = (backlogCount: number): number =>
  Math.max(backlogCount, 0) * ILLUSTRATIVE_HANDLING_TIME_MS

export const backlogHoursHint = (backlogCount: number): string =>
  `${formatTotalHours(illustrativeBacklogMs(backlogCount))} em backlog`
