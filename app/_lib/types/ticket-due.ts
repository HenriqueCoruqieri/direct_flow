import type { TicketPriority, TicketStatus } from "@/app/_lib/types/ticket"

export interface TicketDueFacts {
  createdAt: Date
  priority: TicketPriority
}

export interface TicketSlaFacts extends TicketDueFacts {
  status: TicketStatus
  resolvedAt: Date | null
}

export type TicketRunningSlaStatus = "on_time" | "overdue"

export type TicketSettledSlaStatus = "met" | "missed"

export interface TicketRunningSla {
  status: TicketRunningSlaStatus
  dueAt: Date
}

export interface TicketSettledSla {
  status: TicketSettledSlaStatus
  dueAt: Date
  resolvedAt: Date
}

export interface TicketNeutralSla {
  status: "neutral"
  dueAt: Date
}

export type TicketSla = TicketRunningSla | TicketSettledSla | TicketNeutralSla

export type TicketSlaStatus = TicketSla["status"]

export interface TicketRunningSlaDetail {
  status: TicketRunningSlaStatus
  label: string
  value: string
  dueAt: Date
}

export interface TicketStoppedSlaDetail {
  status: TicketSettledSlaStatus | "neutral"
  label: string
  value: string
}

export type TicketSlaDetail = TicketRunningSlaDetail | TicketStoppedSlaDetail

export interface TicketSlaCell {
  label: string | null
  value: string
}
