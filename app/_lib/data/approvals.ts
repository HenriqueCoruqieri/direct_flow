import { and, desc, eq, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

import { transferPeriodCondition } from "@/app/_lib/data/period-condition"
import { toTransferRecipient } from "@/app/_lib/data/transfer-recipient"
import type { ApprovalListItem } from "@/app/_lib/types/approvals"
import type { DateRange } from "@/app/_lib/types/period"
import { db } from "@/db"
import {
  department,
  tag,
  ticket,
  ticketTag,
  ticketTransfer,
  user,
} from "@/db/schema"

export async function listPendingApprovals(
  departmentId: number,
  range: DateRange | null = null,
): Promise<ApprovalListItem[]> {
  const recipient = alias(user, "transfer_recipient")

  const rows = await db
    .select({
      id: ticket.id,
      title: ticket.title,
      type: ticket.type,
      status: ticket.status,
      tagId: tag.id,
      tagName: tag.name,
      createdAt: ticket.createdAt,
      transferId: ticketTransfer.id,
      fromDepartmentId: ticketTransfer.fromDepartmentId,
      fromDepartmentName: department.name,
      toDepartmentId: ticketTransfer.toDepartmentId,
      recipientId: recipient.id,
      recipientName: recipient.name,
      recipientIsActive: recipient.isActive,
      recipientDepartmentId: recipient.departmentId,
      sentAt: ticketTransfer.createdAt,
    })
    .from(ticketTransfer)
    .innerJoin(ticket, eq(ticket.id, ticketTransfer.ticketId))
    .innerJoin(department, eq(department.id, ticketTransfer.fromDepartmentId))
    .leftJoin(recipient, eq(recipient.id, ticketTransfer.toUserId))
    .leftJoin(ticketTag, eq(ticketTag.ticketId, ticket.id))
    .leftJoin(tag, eq(tag.id, ticketTag.tagId))
    .where(
      and(
        eq(ticketTransfer.toDepartmentId, departmentId),
        eq(ticketTransfer.status, "pendente"),
        transferPeriodCondition(range),
      ),
    )
    .orderBy(desc(ticketTransfer.createdAt), desc(ticketTransfer.id))

  return rows.map(
    ({
      recipientId,
      recipientName,
      recipientIsActive,
      recipientDepartmentId,
      ...item
    }) => ({
      ...item,
      recipient: toTransferRecipient({
        recipientId,
        recipientName,
        recipientIsActive,
        recipientDepartmentId,
      }),
    }),
  )
}

export async function countPendingApprovals(
  departmentId: number,
  recipientId?: number,
): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(*)::int`.mapWith(Number) })
    .from(ticketTransfer)
    .where(
      and(
        eq(ticketTransfer.toDepartmentId, departmentId),
        eq(ticketTransfer.status, "pendente"),
        recipientId === undefined
          ? undefined
          : eq(ticketTransfer.toUserId, recipientId),
      ),
    )

  return row?.total ?? 0
}
