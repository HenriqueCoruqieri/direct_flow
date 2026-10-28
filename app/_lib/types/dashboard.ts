import type { DASHBOARD_VIEW_MODES } from "@/app/_lib/domain/dashboard-view-modes"
import type { TicketPriority } from "@/app/_lib/types/ticket"

export type DashboardViewMode = (typeof DASHBOARD_VIEW_MODES)[number]

export type DashboardByMode<T> = Record<DashboardViewMode, T>

export type DashboardOverviewCard =
  "ticketCount" | "resolutionRate" | "averageResolution" | "backlog"

export interface DashboardOverview {
  ticketCount: number
  receivedTransferCount: number
  periodReceivedCount: number
  periodResolvedCount: number
  averageResolutionMs: number | null
  backlogCount: number
  backlogAgeMs: number
  overdueBacklogCount: number
}

export type DashboardOverviewByMode = DashboardByMode<DashboardOverview>

export interface DashboardOverviewEmptyHints {
  noTickets: string
  noResolutions: string
  emptyBacklog: string
}

export interface DashboardMeasuredResolutionRate {
  kind: "measured"
  percent: number
  barPercent: number
  resolvedCount: number
  receivedCount: number
}

export interface DashboardUnreceivedResolutionRate {
  kind: "unreceived"
  resolvedCount: number
}

export interface DashboardEmptyResolutionRate {
  kind: "empty"
}

export type DashboardResolutionRate =
  | DashboardMeasuredResolutionRate
  | DashboardUnreceivedResolutionRate
  | DashboardEmptyResolutionRate

export type DashboardOverdueColumn = "number" | "title" | "priority" | "dueAt"

export interface DashboardTopTag {
  id: number
  name: string
  ticketCount: number
}

export interface DashboardTopTags {
  ticketCount: number
  tags: DashboardTopTag[]
}

export type DashboardTopTagsByMode = DashboardByMode<DashboardTopTags>

export interface DashboardOverdueTicket {
  id: number
  title: string
  priority: TicketPriority
  dueAt: Date
}

export type DashboardOverdueByMode = DashboardByMode<DashboardOverdueTicket[]>

export interface DashboardOverdueEmptyCopy {
  title: string
  description: string
}

export type DashboardTransferCounter = "incoming" | "outgoing" | "rejected"

export type DashboardTransferCounterTone = "highlight" | "alert" | "neutral"

export interface DashboardTransferSummary {
  incomingPendingCount: number
  outgoingPendingCount: number
  rejectedCount: number
}

export interface DashboardIncomingTransfer {
  transferId: number
  ticketId: number
  ticketTitle: string
  fromDepartmentName: string
  sentAt: Date
}

export type DashboardActivitySeries = "opened" | "resolved"

export interface DashboardActivityCount {
  key: string
  openedCount: number
  resolvedCount: number
}

export interface DashboardActivityPoint {
  key: string
  label: string
  longLabel: string
  opened: number | null
  resolved: number | null
}
