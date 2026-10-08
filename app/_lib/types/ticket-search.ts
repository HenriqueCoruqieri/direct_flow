import type { TicketStatus } from "@/app/_lib/types/ticket"

export interface TicketNumberSearchQuery {
  mode: "number"
  digits: string
}

export interface TicketTitleSearchQuery {
  mode: "title"
  text: string
}

export type TicketSearchQuery = TicketNumberSearchQuery | TicketTitleSearchQuery

export interface TicketSearchResult {
  id: number
  title: string
  status: TicketStatus
}

export interface TicketSearchSuccess {
  ok: true
  results: TicketSearchResult[]
}

export interface TicketSearchFailure {
  ok: false
  message: string
}

export type TicketSearchResponse = TicketSearchSuccess | TicketSearchFailure
