import { and, desc, eq, inArray, or, type SQL, sql } from "drizzle-orm"

import { ticketPeriodCondition } from "@/app/_lib/data/period-condition"
import {
  mapMyTicketsTabs,
  MY_TICKETS_TAB_RULES,
} from "@/app/_lib/domain/my-tickets"
import type {
  MyTicketListItem,
  MyTicketsDepartmentScope,
  MyTicketsTab,
  MyTicketsTabCounts,
} from "@/app/_lib/types/my-tickets"
import type { DateRange } from "@/app/_lib/types/period"
import { db } from "@/db"
import { department, tag, ticket, ticketTag } from "@/db/schema"

const DEPARTMENT_SCOPE_CONDITIONS = {
  origin: eq(ticket.currentDepartmentId, ticket.originDepartmentId),
  any: undefined,
} satisfies Record<MyTicketsDepartmentScope, SQL | undefined>

const tabCondition = (userId: number, tab: MyTicketsTab): SQL | undefined => {
  const rule = MY_TICKETS_TAB_RULES[tab]
  const column =
    rule.relation === "author" ? ticket.createdBy : ticket.assignedTo
  return and(
    eq(column, userId),
    inArray(ticket.status, [...rule.statuses]),
    DEPARTMENT_SCOPE_CONDITIONS[rule.departmentScope],
  )
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
  const columns = mapMyTicketsTabs((tab) =>
    sql<number>`count(*) filter (where ${tabCondition(userId, tab)})`.mapWith(
      Number,
    ),
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

  return row ?? mapMyTicketsTabs(() => 0)
}
