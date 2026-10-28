import type { TicketTransferRecipient } from "@/app/_lib/types/ticket"

interface TransferRecipientColumns {
  recipientId: number | null
  recipientName: string | null
  recipientIsActive: boolean | null
  recipientDepartmentId: number | null
}

export const toTransferRecipient = (
  columns: TransferRecipientColumns,
): TicketTransferRecipient | null =>
  columns.recipientId !== null &&
  columns.recipientName !== null &&
  columns.recipientIsActive !== null &&
  columns.recipientDepartmentId !== null
    ? {
        id: columns.recipientId,
        name: columns.recipientName,
        isActive: columns.recipientIsActive,
        departmentId: columns.recipientDepartmentId,
      }
    : null
