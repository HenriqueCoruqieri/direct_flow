import { and, desc, eq, inArray, type SQL, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

import { ticketPeriodCondition } from "@/app/_lib/data/period-condition"
import {
  DEPARTMENT_QUEUE_TAB_RULES,
  DEPARTMENT_QUEUE_TABS,
} from "@/app/_lib/domain/department-queue"
import type {
  DepartmentQueueListItem,
  DepartmentQueueTab,
  DepartmentQueueTabCounts,
} from "@/app/_lib/types/department-queue"
import type { DateRange } from "@/app/_lib/types/period"
import { db } from "@/db"
import { tag, ticket, ticketTag, ticketTransfer, user } from "@/db/schema"

const queueTabCondition = (
  departmentId: number,
  tab: DepartmentQueueTab,
): SQL =>
  sql`(${eq(ticket.currentDepartmentId, departmentId)} and ${inArray(ticket.status, [...DEPARTMENT_QUEUE_TAB_RULES[tab].statuses])})`

export async function listQueueTickets(
  departmentId: number,
  tab: DepartmentQueueTab,
  range: DateRange | null = null,
): Promise<DepartmentQueueListItem[]> {
  const creator = alias(user, "creator")
  const assignee = alias(user, "assignee")

  return db
    .select({
      id: ticket.id,
      title: ticket.title,
      type: ticket.type,
      status: ticket.status,
      createdBy: ticket.createdBy,
      assignedTo: ticket.assignedTo,
      currentDepartmentId: ticket.currentDepartmentId,
      hasPendingTransfer: sql<boolean>`exists (select 1 from ${ticketTransfer} where ${ticketTransfer.ticketId} = ${ticket.id} and ${ticketTransfer.status} = 'pendente')`,
      tagId: tag.id,
      tagName: tag.name,
      creatorName: creator.name,
      assigneeName: assignee.name,
      createdAt: ticket.createdAt,
    })
    .from(ticket)
    .innerJoin(creator, eq(creator.id, ticket.createdBy))
    .leftJoin(assignee, eq(assignee.id, ticket.assignedTo))
    .leftJoin(ticketTag, eq(ticketTag.ticketId, ticket.id))
    .leftJoin(tag, eq(tag.id, ticketTag.tagId))
    .where(
      and(queueTabCondition(departmentId, tab), ticketPeriodCondition(range)),
    )
    .orderBy(desc(ticket.createdAt), desc(ticket.id))
}

export async function countQueueTicketsByTab(
  departmentId: number,
  range: DateRange | null = null,
): Promise<DepartmentQueueTabCounts> {
  const columns = Object.fromEntries(
    DEPARTMENT_QUEUE_TABS.map((tab) => [
      tab,
      sql<number>`(count(*) filter (where ${queueTabCondition(departmentId, tab)}))::int`.mapWith(
        Number,
      ),
    ]),
  )

  const [row] = await db
    .select(columns)
    .from(ticket)
    .where(
      and(
        eq(ticket.currentDepartmentId, departmentId),
        ticketPeriodCondition(range),
      ),
    )

  const counts: DepartmentQueueTabCounts = {
    open: 0,
    resolved: 0,
    closed: 0,
    cancelled: 0,
  }
  for (const tab of DEPARTMENT_QUEUE_TABS) {
    counts[tab] = row?.[tab] ?? 0
  }
  return counts
}
