import type { TicketStatus, TicketType } from "@/app/_lib/types/ticket"

export interface TicketListRow {
  id: number
  title: string
  type: TicketType
  status: TicketStatus
  tagId: number | null
  tagName: string | null
  createdAt: Date
}
