import type {
  TicketPriority,
  TicketStatus,
  TicketType,
} from "@/app/_lib/types/ticket"
import type { TicketCompanyListFacts } from "@/app/_lib/types/ticket-company"
import type { TicketSlaFacts } from "@/app/_lib/types/ticket-due"

export interface TicketListRow {
  id: number
  title: string
  type: TicketType
  status: TicketStatus
  tagId: number | null
  tagName: string | null
  createdAt: Date
}

export interface TicketSlaListRow extends TicketListRow, TicketSlaFacts {
  priority: TicketPriority
}

export interface TicketCompanyListRow
  extends TicketListRow, TicketCompanyListFacts {}
