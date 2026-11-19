import type { MY_TICKETS_TABS } from "@/app/_lib/domain/my-tickets-tabs"
import type {
  TicketPriority,
  TicketStatus,
  TicketType,
} from "@/app/_lib/types/ticket"
import type { TicketCompanyListFacts } from "@/app/_lib/types/ticket-company"
import type { ApprovalStatus } from "@/app/_lib/types/ticket-transfer"

export type MyTicketsTab = (typeof MY_TICKETS_TABS)[number]

export type MyTicketsOwnershipRelation = "author" | "assignee"

export type MyTicketsRelation =
  MyTicketsOwnershipRelation | "lastTransferRequester"

export type MyTicketsDepartmentScope = "origin" | "any"

export interface MyTicketsTabRuleBase {
  label: string
  statuses: readonly TicketStatus[]
  emptyTitle: string
  emptyDescription: string
}

export interface MyTicketsOwnershipTabRule extends MyTicketsTabRuleBase {
  relation: MyTicketsOwnershipRelation
  departmentScope: MyTicketsDepartmentScope
}

export interface MyTicketsLastTransferMatch {
  transferStatus: ApprovalStatus
  ticketStatuses: readonly TicketStatus[]
  assigneeIsReviewer: boolean
}

export interface MyTicketsLastTransferTabRule extends MyTicketsTabRuleBase {
  relation: "lastTransferRequester"
  lastTransfer: readonly MyTicketsLastTransferMatch[]
}

export type MyTicketsTabRule =
  MyTicketsOwnershipTabRule | MyTicketsLastTransferTabRule

export type MyTicketsTabCounts = Record<MyTicketsTab, number>

export interface MyTicketsEmptyCopy {
  title: string
  description: string
}

export interface MyTicketListItem extends TicketCompanyListFacts {
  id: number
  title: string
  type: TicketType
  status: TicketStatus
  priority: TicketPriority
  tagId: number | null
  tagName: string | null
  currentDepartmentId: number
  currentDepartmentName: string
  createdAt: Date
  dueAt: Date | null
  resolvedAt: Date | null
}
