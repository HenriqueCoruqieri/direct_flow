import { and, desc, eq, sql } from "drizzle-orm"

import { transferPeriodCondition } from "@/app/_lib/data/period-condition"
import type { ApprovalListItem } from "@/app/_lib/types/approvals"
import type { DateRange } from "@/app/_lib/types/period"
import { db } from "@/db"
import { department, tag, ticket, ticketTag, ticketTransfer } from "@/db/schema"

export async function listPendingApprovals(
  departmentId: number,
  range: DateRange | null = null,
): Promise<ApprovalListItem[]> {
  return db
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
      sentAt: ticketTransfer.createdAt,
    })
    .from(ticketTransfer)
    .innerJoin(ticket, eq(ticket.id, ticketTransfer.ticketId))
    .innerJoin(department, eq(department.id, ticketTransfer.fromDepartmentId))
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
}

export async function countPendingApprovals(
  departmentId: number,
): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(*)::int`.mapWith(Number) })
    .from(ticketTransfer)
    .where(
      and(
        eq(ticketTransfer.toDepartmentId, departmentId),
        eq(ticketTransfer.status, "pendente"),
      ),
    )

  return row?.total ?? 0
}
