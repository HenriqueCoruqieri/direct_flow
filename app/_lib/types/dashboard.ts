export interface DashboardTopTag {
  name: string
  count: number
}

export interface DashboardSummary {
  ticketCount: number
  topTag: DashboardTopTag | null
}
