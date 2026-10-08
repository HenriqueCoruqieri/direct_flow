import type { DEPARTMENT_QUEUE_TABS } from "@/app/_lib/domain/department-queue-tabs"
import type { PeriodFilterSelection } from "@/app/_lib/types/period"
import type { TicketStatus, TicketType } from "@/app/_lib/types/ticket"
import type { TicketAssignmentFacts } from "@/app/_lib/types/ticket-assignment"

export type DepartmentQueueTab = (typeof DEPARTMENT_QUEUE_TABS)[number]

export type DepartmentQueueAssigneeCriterion = "any" | "unassigned" | "assigned"

export interface DepartmentQueueTabRule {
  label: string
  statuses: readonly TicketStatus[]
  assignee: DepartmentQueueAssigneeCriterion
  emptyTitle: string
  emptyDescription: string
}

export type DepartmentQueueTabCounts = Record<DepartmentQueueTab, number>

export interface DepartmentQueueAccessFacts {
  isUnassigned: boolean
}

export interface DepartmentQueueLocation {
  tab: DepartmentQueueTab
  period: PeriodFilterSelection
  departmentId: number | null
}

export interface DepartmentQueueListItem extends TicketAssignmentFacts {
  id: number
  title: string
  type: TicketType
  tagId: number | null
  tagName: string | null
  creatorName: string
  assigneeName: string | null
  createdAt: Date
}

export interface DepartmentQueueRowActions {
  assume: boolean
  send: boolean
}
