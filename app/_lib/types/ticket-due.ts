import type { TicketPriority } from "@/app/_lib/types/ticket"

export interface TicketDueFacts {
  createdAt: Date
  priority: TicketPriority
}
