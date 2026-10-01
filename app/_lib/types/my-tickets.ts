import type { MY_TICKETS_TABS } from "@/app/_lib/domain/my-tickets-tabs"
import type { TicketStatus, TicketType } from "@/app/_lib/types/ticket"

export type MyTicketsTab = (typeof MY_TICKETS_TABS)[number]

export type MyTicketsRelation = "author" | "assignee"

export interface MyTicketsTabRule {
  label: string
  relation: MyTicketsRelation
  statuses: readonly TicketStatus[]
  emptyTitle: string
  emptyDescription: string
}

export type MyTicketsTabCounts = Record<MyTicketsTab, number>

export interface MyTicketListItem {
  id: number
  title: string
  type: TicketType
  status: TicketStatus
  tagId: number | null
  tagName: string | null
  currentDepartmentId: number
  currentDepartmentName: string
  createdAt: Date
}
