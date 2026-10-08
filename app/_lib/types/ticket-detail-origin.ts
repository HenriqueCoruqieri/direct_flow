import type { DepartmentQueueLocation } from "@/app/_lib/types/department-queue"

export interface TicketDetailMyTicketsOrigin {
  source: "my_tickets"
}

export interface TicketDetailQueueOrigin {
  source: "queue"
  location: DepartmentQueueLocation
}

export type TicketDetailOrigin =
  TicketDetailMyTicketsOrigin | TicketDetailQueueOrigin

export interface TicketDetailBackLink {
  href: string
  label: string
}
