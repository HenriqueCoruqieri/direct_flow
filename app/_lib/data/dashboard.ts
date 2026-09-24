import { and, asc, count, desc, eq, gte, lt, sql } from "drizzle-orm"

import type { DashboardSummary } from "@/app/_lib/types/dashboard"
import type { DateRange } from "@/app/_lib/types/period"
import { db } from "@/db"
import { tag, ticket, ticketTag } from "@/db/schema"

export async function getDashboardSummary(
  departmentId: number,
  range: DateRange,
): Promise<DashboardSummary> {
  const inScope = and(
    eq(ticket.currentDepartmentId, departmentId),
    gte(ticket.createdAt, range.start),
    lt(ticket.createdAt, range.end),
  )

  const [ticketCountRows, topTagRows] = await Promise.all([
    db.select({ value: count() }).from(ticket).where(inScope),
    db
      .select({ id: tag.id, name: tag.name, count: count() })
      .from(ticketTag)
      .innerJoin(tag, eq(ticketTag.tagId, tag.id))
      .innerJoin(ticket, eq(ticketTag.ticketId, ticket.id))
      .where(and(inScope, eq(tag.departmentId, departmentId)))
      .groupBy(tag.id, tag.name)
      .orderBy(desc(count()), asc(sql`lower(${tag.name})`), asc(tag.id))
      .limit(1),
  ])

  const topTagRow = topTagRows[0]

  return {
    ticketCount: ticketCountRows[0]?.value ?? 0,
    topTag: topTagRow ? { name: topTagRow.name, count: topTagRow.count } : null,
  }
}
