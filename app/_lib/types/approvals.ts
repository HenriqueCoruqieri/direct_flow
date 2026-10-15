import type { TicketStatus, TicketType } from "@/app/_lib/types/ticket"

export interface ApprovalsAccessFacts {
  departmentId: number
  isUnassigned: boolean
}

export interface ApprovalListItem {
  id: number
  title: string
  type: TicketType
  status: TicketStatus
  tagId: number | null
  tagName: string | null
  createdAt: Date
  transferId: number
  fromDepartmentId: number
  fromDepartmentName: string
  sentAt: Date
}

export interface ApprovalsNavBadge {
  text: string
  accessibleLabel: string
}
