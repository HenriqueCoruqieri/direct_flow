import {
  elapsedMs,
  formatDuration,
  formatRangeLabel,
  formatTimeBucket,
  formatTimeBucketLong,
  formatTotalHours,
  HOUR_MS,
  MINUTE_MS,
  rangeDayCount,
  rangeWeekCount,
  toDateKey,
  todayKey,
} from "@/app/_lib/date"
import { APPROVALS_LABEL } from "@/app/_lib/domain/approvals"
import { DEPARTMENT_QUEUE_OPEN_STATUSES } from "@/app/_lib/domain/department-queue"
import {
  type ActiveTicketStatus,
  CLOSED_TICKET_STATUS,
  RESOLVED_TICKET_STATUS,
  TICKET_PRIORITY_FIELD_LABEL,
} from "@/app/_lib/domain/ticket"
import type {
  DashboardActivityCount,
  DashboardActivityPoint,
  DashboardActivitySeries,
  DashboardOverdueColumn,
  DashboardOverview,
  DashboardOverviewCard,
  DashboardOverviewEmptyHints,
  DashboardResolutionRate,
  DashboardTransferCounter,
  DashboardTransferCounterTone,
  DashboardViewMode,
} from "@/app/_lib/types/dashboard"
import type { DepartmentQueueTab } from "@/app/_lib/types/department-queue"
import type {
  DateRange,
  TimeBucket,
  TimeBucketGranularity,
} from "@/app/_lib/types/period"
import type { TicketStatus } from "@/app/_lib/types/ticket"

export const DASHBOARD_PATH = "/dashboard"

export const DASHBOARD_LABEL = "Início"

export { DASHBOARD_VIEW_MODES } from "@/app/_lib/domain/dashboard-view-modes"

export const DEFAULT_DASHBOARD_VIEW_MODE: DashboardViewMode = "coletivo"

export const DASHBOARD_VIEW_MODE_LABELS = {
  coletivo: "Coletivo",
  individual: "Individual",
} satisfies Record<DashboardViewMode, string>

export const DASHBOARD_VIEW_MODE_GROUP_LABEL = "Visão dos indicadores"

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

export const NO_OWN_TICKETS_IN_PERIOD_HINT = "Nenhum chamado seu no período"

export const DASHBOARD_OVERVIEW_EMPTY_HINTS = {
  coletivo: {
    noTickets: NO_TICKETS_IN_PERIOD_HINT,
    noResolutions: NO_RESOLUTIONS_IN_PERIOD_HINT,
    emptyBacklog: EMPTY_BACKLOG_HINT,
  },
  individual: {
    noTickets: NO_OWN_TICKETS_IN_PERIOD_HINT,
    noResolutions: "Nenhum resolvido por você no período",
    emptyBacklog: "Nenhum chamado seu em backlog",
  },
} satisfies Record<DashboardViewMode, DashboardOverviewEmptyHints>

export const receivedTransfersHint = (
  count: number,
  mode: DashboardViewMode = DEFAULT_DASHBOARD_VIEW_MODE,
): string => {
  if (mode === "individual") {
    if (count <= 0) return "Nenhum aceito por você"
    return `+${count} ${count === 1 ? "aceito" : "aceitos"} por você`
  }
  if (count <= 0) return "Nenhum recebido de outros setores"
  return `+${count} ${count === 1 ? "recebido" : "recebidos"} de outros setores`
}

const floorPercent = (part: number, whole: number): number =>
  Math.floor((part * 100) / whole)

const resolvedLabel = (count: number): string =>
  `${count} ${count === 1 ? "resolvido" : "resolvidos"}`

export const RESOLUTION_BAR_MAX_PERCENT = 100

export const resolutionRateFor = (
  overview: DashboardOverview,
): DashboardResolutionRate => {
  const resolvedCount = Math.max(overview.periodResolvedCount, 0)
  const receivedCount = Math.max(overview.periodReceivedCount, 0)
  if (receivedCount > 0) {
    const percent = floorPercent(resolvedCount, receivedCount)
    return {
      kind: "measured",
      percent,
      barPercent: Math.min(percent, RESOLUTION_BAR_MAX_PERCENT),
      resolvedCount,
      receivedCount,
    }
  }
  if (resolvedCount > 0) return { kind: "unreceived", resolvedCount }
  return { kind: "empty" }
}

export const resolvedOfReceivedHint = (
  resolvedCount: number,
  receivedCount: number,
): string => `${resolvedLabel(resolvedCount)} de ${receivedCount}`

export const resolvedWithoutReceivedHint = (resolvedCount: number): string =>
  `${resolvedLabel(resolvedCount)}, nenhum recebido`

export const formatResolutionRate = (percent: number): string => `${percent}%`

export const ILLUSTRATIVE_LABEL = "Ilustrativo"

export const ILLUSTRATIVE_DESCRIPTION =
  "Valor de exemplo: o sistema ainda não mede este dado."

export const ILLUSTRATIVE_FIRST_RESPONSE_MS = 22 * MINUTE_MS

export const firstResponseHint = (): string =>
  `1ª resposta em ${formatDuration(ILLUSTRATIVE_FIRST_RESPONSE_MS)}`

export const ticketCountLabel = (count: number): string =>
  `${count} ${count === 1 ? "chamado" : "chamados"}`

export const backlogValueLabel = (overview: DashboardOverview): string =>
  ticketCountLabel(Math.max(overview.overdueBacklogCount, 0))

export const backlogHint = (
  overview: DashboardOverview,
  mode: DashboardViewMode = DEFAULT_DASHBOARD_VIEW_MODE,
): string =>
  overview.backlogCount > 0
    ? `${formatTotalHours(overview.backlogAgeMs)} em backlog`
    : DASHBOARD_OVERVIEW_EMPTY_HINTS[mode].emptyBacklog

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
  priority: TICKET_PRIORITY_FIELD_LABEL,
  dueAt: "Vencimento",
} satisfies Record<DashboardOverdueColumn, string>

export const NO_TAGGED_TICKETS_IN_PERIOD_HINT =
  "Nenhum chamado com tag no período"

export const NO_OWN_TAGGED_TICKETS_IN_PERIOD_HINT =
  "Nenhum chamado seu com tag no período"

export const NO_TAGGED_TICKETS_IN_PERIOD_HINTS = {
  coletivo: NO_TAGGED_TICKETS_IN_PERIOD_HINT,
  individual: NO_OWN_TAGGED_TICKETS_IN_PERIOD_HINT,
} satisfies Record<DashboardViewMode, string>

export const EMPTY_OVERDUE_TITLE = "Nenhum chamado em atraso"

export const EMPTY_OVERDUE_DESCRIPTION =
  "Os chamados do setor com vencimento já passado aparecem aqui."

export const topTagsEmptyHint = (
  ticketCount: number,
  mode: DashboardViewMode = DEFAULT_DASHBOARD_VIEW_MODE,
): string =>
  ticketCount > 0
    ? NO_TAGGED_TICKETS_IN_PERIOD_HINTS[mode]
    : DASHBOARD_OVERVIEW_EMPTY_HINTS[mode].noTickets

export const tagVolumePercent = (
  tagCount: number,
  ticketCount: number,
): number | null => {
  if (ticketCount <= 0) return null
  const tagged = Math.min(Math.max(tagCount, 0), ticketCount)
  return floorPercent(tagged, ticketCount)
}

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

export const ACTIVITY_MAX_DAY_BUCKETS = 31

export const ACTIVITY_MAX_WEEK_BUCKETS = 53

export const ACTIVITY_CARD_LABEL = "Abertos × resolvidos"

export const ACTIVITY_LOADING_LABEL = "Carregando abertos × resolvidos"

export const ACTIVITY_SERIES = [
  "opened",
  "resolved",
] as const satisfies readonly DashboardActivitySeries[]

export const ACTIVITY_SERIES_LABELS = {
  opened: "Abertos",
  resolved: "Resolvidos",
} satisfies Record<DashboardActivitySeries, string>

export const ACTIVITY_SERIES_COLORS = {
  opened: "var(--status-aberto)",
  resolved: "var(--status-resolvido)",
} satisfies Record<DashboardActivitySeries, string>

export const ACTIVITY_GRANULARITY_LABELS = {
  hour: "por hora",
  day: "por dia",
  week: "por semana",
  month: "por mês",
} satisfies Record<TimeBucketGranularity, string>

export const ACTIVITY_BUCKET_COLUMN_LABELS = {
  hour: "Hora",
  day: "Dia",
  week: "Semana",
  month: "Mês",
} satisfies Record<TimeBucketGranularity, string>

export const ACTIVITY_TODAY_LABEL = "Hoje"

export const EMPTY_ACTIVITY_TITLE =
  "Nenhum chamado aberto ou resolvido no período"

export const EMPTY_ACTIVITY_DESCRIPTIONS = {
  hour: "Os chamados abertos e resolvidos no setor aparecem aqui, hora a hora.",
  day: "Os chamados abertos e resolvidos no setor aparecem aqui, dia a dia.",
  week: "Os chamados abertos e resolvidos no setor aparecem aqui, semana a semana.",
  month: "Os chamados abertos e resolvidos no setor aparecem aqui, mês a mês.",
} satisfies Record<TimeBucketGranularity, string>

export const activityGranularityFor = (
  range: DateRange,
): TimeBucketGranularity => {
  const days = rangeDayCount(range)
  if (days <= 1) return "hour"
  if (days <= ACTIVITY_MAX_DAY_BUCKETS) return "day"
  if (rangeWeekCount(range) <= ACTIVITY_MAX_WEEK_BUCKETS) return "week"
  return "month"
}

export const activityPeriodLabel = (
  range: DateRange,
  granularity: TimeBucketGranularity,
): string =>
  `${formatRangeLabel(range)} · ${ACTIVITY_GRANULARITY_LABELS[granularity]}`

export const activityTableCaption = (
  range: DateRange,
  granularity: TimeBucketGranularity,
): string =>
  `${ACTIVITY_CARD_LABEL}, ${activityPeriodLabel(range, granularity)}`

export const isFutureBucket = (bucket: TimeBucket, now: Date): boolean =>
  bucket.start.getTime() > now.getTime()

export const activityBucketLabel = (
  bucket: TimeBucket,
  granularity: TimeBucketGranularity,
  now: Date,
): string =>
  granularity === "day" && toDateKey(bucket.start) === todayKey(now)
    ? ACTIVITY_TODAY_LABEL
    : formatTimeBucket(bucket, granularity)

const countOrZero = (value: number | undefined): number =>
  Math.max(value ?? 0, 0)

export const buildActivitySeries = (
  buckets: readonly TimeBucket[],
  granularity: TimeBucketGranularity,
  counts: readonly DashboardActivityCount[],
  now: Date,
): DashboardActivityPoint[] => {
  const countsByKey = new Map(counts.map((count) => [count.key, count]))
  return buckets.map((bucket) => {
    const count = countsByKey.get(bucket.key)
    const isFuture = isFutureBucket(bucket, now)
    return {
      key: bucket.key,
      label: activityBucketLabel(bucket, granularity, now),
      longLabel: formatTimeBucketLong(bucket, granularity),
      opened: isFuture ? null : countOrZero(count?.openedCount),
      resolved: isFuture ? null : countOrZero(count?.resolvedCount),
    }
  })
}

export const isRecordedActivityPoint = (
  point: DashboardActivityPoint,
): boolean => point.opened !== null && point.resolved !== null

export const recordedActivityPoints = (
  points: readonly DashboardActivityPoint[],
): DashboardActivityPoint[] => points.filter(isRecordedActivityPoint)

export const activityLastPointIndex = (
  points: readonly DashboardActivityPoint[],
): number => points.findLastIndex(isRecordedActivityPoint)

export const isActivityEmpty = (
  points: readonly DashboardActivityPoint[],
): boolean =>
  points.every(
    (point) => (point.opened ?? 0) === 0 && (point.resolved ?? 0) === 0,
  )
