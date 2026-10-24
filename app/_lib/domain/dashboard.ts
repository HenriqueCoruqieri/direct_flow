import {
  elapsedMs,
  formatDuration,
  formatTotalHours,
  formatWeekdayDay,
  formatWeekdayLong,
  HOUR_MS,
  MINUTE_MS,
} from "@/app/_lib/date"
import { APPROVALS_LABEL } from "@/app/_lib/domain/approvals"
import { DEPARTMENT_QUEUE_OPEN_STATUSES } from "@/app/_lib/domain/department-queue"
import {
  type ActiveTicketStatus,
  CLOSED_TICKET_STATUS,
  RESOLVED_TICKET_STATUS,
} from "@/app/_lib/domain/ticket"
import type {
  DashboardDailyActivityPoint,
  DashboardDailyActivitySeries,
  DashboardDailyCount,
  DashboardOverdueColumn,
  DashboardOverviewCard,
  DashboardTransferCounter,
  DashboardTransferCounterTone,
} from "@/app/_lib/types/dashboard"
import type { DepartmentQueueTab } from "@/app/_lib/types/department-queue"
import type { DateKey, DayWindow } from "@/app/_lib/types/period"
import type { TicketStatus } from "@/app/_lib/types/ticket"

export const DASHBOARD_PATH = "/dashboard"

export const DASHBOARD_LABEL = "Início"

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

export const TOP_TAGS_CARD_LABEL = "Principal ofensor"

export const OVERDUE_CARD_LABEL = "Maiores atrasos"

export const OVERDUE_QUEUE_LINK_LABEL = "Ver na fila"

export const OVERDUE_QUEUE_TAB: DepartmentQueueTab = "all"

export const OVERDUE_TICKETS_LIMIT = 5

export const TOP_TAGS_LIMIT = OVERDUE_TICKETS_LIMIT + 1

export const OVERDUE_TICKET_STATUSES: readonly ActiveTicketStatus[] =
  BACKLOG_TICKET_STATUSES

export const OVERDUE_COLUMN_LABELS = {
  number: "Nº",
  title: "Título",
  priority: "Prioridade",
  dueAt: "Vencimento",
} satisfies Record<DashboardOverdueColumn, string>

export const NO_TAGGED_TICKETS_IN_PERIOD_HINT =
  "Nenhum chamado com tag no período"

export const EMPTY_OVERDUE_TITLE = "Nenhum chamado em atraso"

export const EMPTY_OVERDUE_DESCRIPTION =
  "Os chamados do setor com vencimento já passado aparecem aqui."

export const topTagsEmptyHint = (ticketCount: number): string =>
  ticketCount > 0 ? NO_TAGGED_TICKETS_IN_PERIOD_HINT : NO_TICKETS_IN_PERIOD_HINT

export const tagVolumePercent = (
  tagCount: number,
  ticketCount: number,
): number | null => {
  if (ticketCount <= 0) return null
  const tagged = Math.min(Math.max(tagCount, 0), ticketCount)
  return Math.floor((tagged / ticketCount) * 100)
}

const ticketCountLabel = (count: number): string =>
  `${count} ${count === 1 ? "chamado" : "chamados"}`

const volumeLabel = (tagCount: number, ticketCount: number): string | null => {
  const percent = tagVolumePercent(tagCount, ticketCount)
  if (percent === null) return null
  if (percent === 0 && tagCount > 0) return "< 1% do volume"
  return `${percent}% do volume`
}

export const topTagVolumeHint = (
  tagCount: number,
  ticketCount: number,
): string => {
  const volume = volumeLabel(tagCount, ticketCount)
  const count = ticketCountLabel(tagCount)
  return volume === null ? count : `${count} · ${volume}`
}

export const tagBarPercent = (count: number, maxCount: number): number => {
  if (maxCount <= 0) return 0
  return (Math.min(Math.max(count, 0), maxCount) / maxCount) * 100
}

export const TRANSFERS_CARD_LABEL = "Transferências entre setores"

export const TRANSFER_COUNTER_LABELS = {
  incoming: "Aguardando nosso aceite",
  outgoing: "Enviados, pendentes",
  rejected: "Recusados por outros",
} satisfies Record<DashboardTransferCounter, string>

export const REJECTED_TRANSFERS_SCOPE_HINT = "no período"

export const TRANSFERS_APPROVALS_LINK_LABEL = `Ver em ${APPROVALS_LABEL}`

export const INCOMING_TRANSFERS_LIMIT = 5

export const INCOMING_TRANSFER_STALE_HOURS = 4

export const INCOMING_TRANSFER_STALE_MS =
  INCOMING_TRANSFER_STALE_HOURS * HOUR_MS

export const STALE_INCOMING_TRANSFER_LABEL = `Aguardando aceite há ${formatDuration(INCOMING_TRANSFER_STALE_MS)} ou mais`

export const EMPTY_INCOMING_TRANSFERS_TITLE = "Nenhum chamado aguardando aceite"

export const EMPTY_INCOMING_TRANSFERS_DESCRIPTION =
  "Os chamados enviados por outros setores aparecem aqui até alguém do setor atender ou recusar."

export const transferCounterToneFor = (
  counter: DashboardTransferCounter,
  count: number,
): DashboardTransferCounterTone => {
  if (count <= 0) return "neutral"
  if (counter === "incoming") return "highlight"
  if (counter === "rejected") return "alert"
  return "neutral"
}

export const incomingTransferOriginLabel = (departmentName: string): string =>
  `de ${departmentName}`

export const isStaleIncomingTransfer = (sentAt: Date, now: Date): boolean =>
  elapsedMs(sentAt, now) >= INCOMING_TRANSFER_STALE_MS

export const DAILY_ACTIVITY_DAYS = 7

export const DAILY_ACTIVITY_CARD_LABEL = `Últimos ${DAILY_ACTIVITY_DAYS} dias`

export const DAILY_ACTIVITY_LOADING_LABEL = `Carregando últimos ${DAILY_ACTIVITY_DAYS} dias`

export const DAILY_ACTIVITY_SERIES = [
  "opened",
  "resolved",
] as const satisfies readonly DashboardDailyActivitySeries[]

export const DAILY_ACTIVITY_SERIES_LABELS = {
  opened: "Abertos",
  resolved: "Resolvidos",
} satisfies Record<DashboardDailyActivitySeries, string>

export const DAILY_ACTIVITY_SERIES_COLORS = {
  opened: "var(--status-aberto)",
  resolved: "var(--status-resolvido)",
} satisfies Record<DashboardDailyActivitySeries, string>

export const DAILY_ACTIVITY_DAY_COLUMN_LABEL = "Dia"

export const DAILY_ACTIVITY_TODAY_LABEL = "Hoje"

export const EMPTY_DAILY_ACTIVITY_TITLE = `Nenhum chamado aberto ou resolvido nos últimos ${DAILY_ACTIVITY_DAYS} dias`

export const EMPTY_DAILY_ACTIVITY_DESCRIPTION =
  "Os chamados abertos e resolvidos no setor aparecem aqui, dia a dia."

export const dailyActivityDayLabel = (key: DateKey, today: DateKey): string =>
  key === today ? DAILY_ACTIVITY_TODAY_LABEL : formatWeekdayDay(key)

export const buildDailyActivitySeries = (
  days: readonly DayWindow[],
  counts: readonly DashboardDailyCount[],
  today: DateKey,
): DashboardDailyActivityPoint[] => {
  const countsByKey = new Map(counts.map((count) => [count.key, count]))
  return days.map((day) => {
    const count = countsByKey.get(day.key)
    return {
      key: day.key,
      label: dailyActivityDayLabel(day.key, today),
      longLabel: formatWeekdayLong(day.key),
      opened: Math.max(count?.openedCount ?? 0, 0),
      resolved: Math.max(count?.resolvedCount ?? 0, 0),
    }
  })
}

export const isDailyActivityEmpty = (
  points: readonly DashboardDailyActivityPoint[],
): boolean =>
  points.every((point) => point.opened === 0 && point.resolved === 0)
