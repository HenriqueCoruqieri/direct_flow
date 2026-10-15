import type { DepartmentQueueLocation } from "@/app/_lib/types/department-queue"
import type { PeriodFilterSelection } from "@/app/_lib/types/period"

export interface TicketDetailMyTicketsOrigin {
  source: "my_tickets"
}

export interface TicketDetailQueueOrigin {
  source: "queue"
  location: DepartmentQueueLocation
}

export interface TicketDetailApprovalsOrigin {
  source: "approvals"
  period: PeriodFilterSelection
}

export type TicketDetailOrigin =
  | TicketDetailMyTicketsOrigin
  | TicketDetailQueueOrigin
  | TicketDetailApprovalsOrigin

export interface TicketDetailBackLink {
  href: string
  label: string
}
