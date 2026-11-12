import type { TicketStatus } from "@/app/_lib/types/ticket"

export interface TicketSlaFacts {
  status: TicketStatus
  dueAt: Date | null
  resolvedAt: Date | null
}

export type TicketRunningSlaStatus = "on_time" | "overdue"

export type TicketSettledSlaStatus = "met" | "missed"

export type TicketPausedSlaStatus = "awaiting_acceptance" | "neutral"

export interface TicketRunningSla {
  status: TicketRunningSlaStatus
  dueAt: Date
}

export interface TicketSettledSla {
  status: TicketSettledSlaStatus
  dueAt: Date
  resolvedAt: Date
}

export interface TicketPausedSla {
  status: TicketPausedSlaStatus
}

export type TicketSla = TicketRunningSla | TicketSettledSla | TicketPausedSla

export type TicketSlaStatus = TicketSla["status"]

export interface TicketRunningSlaDetail {
  status: TicketRunningSlaStatus
  label: string
  value: string
  dueAt: Date
}

export interface TicketStoppedSlaDetail {
  status: TicketSettledSlaStatus | TicketPausedSlaStatus
  label: string
  value: string
}

export type TicketSlaDetail = TicketRunningSlaDetail | TicketStoppedSlaDetail

export interface TicketSlaCell {
  label: string | null
  value: string
}
