import type {
  TicketStatus,
  TicketTransferRecipient,
  TicketType,
} from "@/app/_lib/types/ticket"

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
  toDepartmentId: number
  recipient: TicketTransferRecipient | null
  sentAt: Date
}
