import { HOUR_MS } from "@/app/_lib/date"
import type { TicketPriority } from "@/app/_lib/types/ticket"
import type { TicketDueFacts } from "@/app/_lib/types/ticket-due"

export const TICKET_PRIORITY_DUE_HOURS = {
  critica: 4,
  alta: 8,
  media: 24,
  baixa: 72,
} satisfies Record<TicketPriority, number>

export const ticketDueWindowMs = (priority: TicketPriority): number =>
  TICKET_PRIORITY_DUE_HOURS[priority] * HOUR_MS

export const ticketDueAt = (facts: TicketDueFacts): Date =>
  new Date(facts.createdAt.getTime() + ticketDueWindowMs(facts.priority))

export const isTicketOverdue = (facts: TicketDueFacts, now: Date): boolean =>
  ticketDueAt(facts).getTime() < now.getTime()
