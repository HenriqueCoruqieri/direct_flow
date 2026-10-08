import { MY_TICKETS_LABEL, MY_TICKETS_PATH } from "@/app/_lib/domain/my-tickets"
import type {
  TicketDetailBackLink,
  TicketDetailMyTicketsOrigin,
  TicketDetailQueueOrigin,
} from "@/app/_lib/types/ticket-detail-origin"

export const TICKET_DETAIL_FROM_PARAM = "from"

export const TICKET_DETAIL_FROM_QUEUE =
  "queue" as const satisfies TicketDetailQueueOrigin["source"]

export const MY_TICKETS_ORIGIN: TicketDetailMyTicketsOrigin = {
  source: "my_tickets",
}

export const MY_TICKETS_BACK_LINK: TicketDetailBackLink = {
  href: MY_TICKETS_PATH,
  label: MY_TICKETS_LABEL,
}
