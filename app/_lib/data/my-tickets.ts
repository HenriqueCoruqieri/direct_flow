import { and, desc, eq, inArray, or, type SQL, sql } from "drizzle-orm"

import { ticketPeriodCondition } from "@/app/_lib/data/period-condition"
import {
  MY_TICKETS_TAB_RULES,
  MY_TICKETS_TABS,
} from "@/app/_lib/domain/my-tickets"
import type {
  MyTicketListItem,
  MyTicketsTab,
  MyTicketsTabCounts,
} from "@/app/_lib/types/my-tickets"
import type { DateRange } from "@/app/_lib/types/period"
import { db } from "@/db"
import { department, tag, ticket, ticketTag } from "@/db/schema"

const tabCondition = (userId: number, tab: MyTicketsTab): SQL => {
  const rule = MY_TICKETS_TAB_RULES[tab]
  const column =
    rule.relation === "author" ? ticket.createdBy : ticket.assignedTo
  return sql`(${eq(column, userId)} and ${inArray(ticket.status, [...rule.statuses])})`
}

export async function listMyTickets(
  userId: number,
  tab: MyTicketsTab,
  range: DateRange | null = null,
): Promise<MyTicketListItem[]> {
  return db
    .select({
      id: ticket.id,
      title: ticket.title,
      type: ticket.type,
      status: ticket.status,
      tagId: tag.id,
      tagName: tag.name,
      currentDepartmentId: ticket.currentDepartmentId,
      currentDepartmentName: department.name,
      createdAt: ticket.createdAt,
    })
    .from(ticket)
    .innerJoin(department, eq(department.id, ticket.currentDepartmentId))
    .leftJoin(ticketTag, eq(ticketTag.ticketId, ticket.id))
    .leftJoin(tag, eq(tag.id, ticketTag.tagId))
    .where(and(tabCondition(userId, tab), ticketPeriodCondition(range)))
    .orderBy(desc(ticket.createdAt), desc(ticket.id))
}

export async function countMyTicketsByTab(
  userId: number,
  range: DateRange | null = null,
): Promise<MyTicketsTabCounts> {
  const columns = Object.fromEntries(
    MY_TICKETS_TABS.map((tab) => [
      tab,
      sql<number>`count(*) filter (where ${tabCondition(userId, tab)})`.mapWith(
        Number,
      ),
    ]),
  )

  const [row] = await db
    .select(columns)
    .from(ticket)
    .where(
      and(
        or(eq(ticket.createdBy, userId), eq(ticket.assignedTo, userId)),
        ticketPeriodCondition(range),
      ),
    )

  const counts: MyTicketsTabCounts = {
    opened: 0,
    assigned: 0,
    closed: 0,
    cancelled: 0,
  }
  for (const tab of MY_TICKETS_TABS) {
    counts[tab] = row?.[tab] ?? 0
  }
  return counts
}
