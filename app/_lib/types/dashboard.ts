export type DashboardOverviewCard =
  "ticketCount" | "resolutionRate" | "averageResolution" | "backlog"

export interface DashboardOverview {
  ticketCount: number
  receivedTransferCount: number
  resolvedTicketCount: number
  averageResolutionMs: number | null
  backlogCount: number
}
