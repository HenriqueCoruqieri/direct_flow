import type { DateKey } from "@/app/_lib/types/period"
import type { TicketPriority } from "@/app/_lib/types/ticket"

export type DashboardOverviewCard =
  "ticketCount" | "resolutionRate" | "averageResolution" | "backlog"

export interface DashboardOverview {
  ticketCount: number
  receivedTransferCount: number
  resolvedTicketCount: number
  averageResolutionMs: number | null
  backlogCount: number
}

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

export interface DashboardOverdueTicket {
  id: number
  title: string
  priority: TicketPriority
  dueAt: Date
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

export type DashboardDailyActivitySeries = "opened" | "resolved"

export interface DashboardDailyCount {
  key: DateKey
  openedCount: number
  resolvedCount: number
}

export interface DashboardDailyActivityPoint {
  key: DateKey
  label: string
  longLabel: string
  opened: number
  resolved: number
}
