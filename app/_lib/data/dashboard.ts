import { and, asc, count, desc, eq, gte, inArray, lt, sql } from "drizzle-orm"

import {
  BACKLOG_TICKET_STATUSES,
  DASHBOARD_RESOLVED_STATUSES,
  OVERDUE_TICKET_STATUSES,
} from "@/app/_lib/domain/dashboard"
import { TICKET_PRIORITIES } from "@/app/_lib/domain/ticket"
import {
  TICKET_PRIORITY_DUE_HOURS,
  ticketDueAt,
} from "@/app/_lib/domain/ticket-due"
import type {
  DashboardOverdueTicket,
  DashboardOverview,
  DashboardTopTags,
} from "@/app/_lib/types/dashboard"
import type { DateRange } from "@/app/_lib/types/period"
import { db } from "@/db"
import { tag, ticket, ticketTag, ticketTransfer } from "@/db/schema"

export async function findDashboardOverview(
  departmentId: number,
  range: DateRange,
): Promise<DashboardOverview> {
  const createdInRange = and(
    gte(ticket.createdAt, range.start),
    lt(ticket.createdAt, range.end),
  )
  const resolvedInRange = and(
    gte(ticket.resolvedAt, range.start),
    lt(ticket.resolvedAt, range.end),
  )
  const isResolvedStatus = inArray(ticket.status, [
    ...DASHBOARD_RESOLVED_STATUSES,
  ])
  const isBacklogStatus = inArray(ticket.status, [...BACKLOG_TICKET_STATUSES])

  const [ticketRows, transferRows] = await Promise.all([
    db
      .select({
        ticketCount: sql<number>`(count(*) filter (where ${createdInRange}))::int`,
        resolvedTicketCount: sql<number>`(count(*) filter (where ${createdInRange} and ${isResolvedStatus}))::int`,
        averageResolutionMs: sql<
          string | null
        >`avg(extract(epoch from (${ticket.resolvedAt} - ${ticket.createdAt})) * 1000) filter (where ${resolvedInRange} and ${isResolvedStatus})`,
        backlogCount: sql<number>`(count(*) filter (where ${isBacklogStatus}))::int`,
      })
      .from(ticket)
      .where(eq(ticket.currentDepartmentId, departmentId)),
    db
      .select({ value: sql<number>`(${count()})::int` })
      .from(ticketTransfer)
      .where(
        and(
          eq(ticketTransfer.toDepartmentId, departmentId),
          eq(ticketTransfer.status, "aprovado"),
          gte(ticketTransfer.reviewedAt, range.start),
          lt(ticketTransfer.reviewedAt, range.end),
        ),
      ),
  ])

  const ticketRow = ticketRows[0]
  const averageResolutionMs = ticketRow?.averageResolutionMs ?? null

  return {
    ticketCount: ticketRow?.ticketCount ?? 0,
    receivedTransferCount: transferRows[0]?.value ?? 0,
    resolvedTicketCount: ticketRow?.resolvedTicketCount ?? 0,
    averageResolutionMs:
      averageResolutionMs === null ? null : Number(averageResolutionMs),
    backlogCount: ticketRow?.backlogCount ?? 0,
  }
}

export async function listDashboardTopTags(
  departmentId: number,
  range: DateRange,
  limit: number,
): Promise<DashboardTopTags> {
  const createdInRange = and(
    eq(ticket.currentDepartmentId, departmentId),
    gte(ticket.createdAt, range.start),
    lt(ticket.createdAt, range.end),
  )
  const tagTicketCount = count()

  const [totalRows, tagRows] = await Promise.all([
    db
      .select({ value: sql<number>`(${count()})::int` })
      .from(ticket)
      .where(createdInRange),
    db
      .select({
        id: tag.id,
        name: tag.name,
        ticketCount: sql<number>`(${tagTicketCount})::int`,
      })
      .from(ticketTag)
      .innerJoin(tag, eq(tag.id, ticketTag.tagId))
      .innerJoin(ticket, eq(ticket.id, ticketTag.ticketId))
      .where(and(createdInRange, eq(tag.departmentId, departmentId)))
      .groupBy(tag.id, tag.name)
      .orderBy(desc(tagTicketCount), asc(sql`lower(${tag.name})`), asc(tag.id))
      .limit(limit),
  ])

  return { ticketCount: totalRows[0]?.value ?? 0, tags: tagRows }
}

export async function listOverdueTickets(
  departmentId: number,
  now: Date,
  limit: number,
): Promise<DashboardOverdueTicket[]> {
  const dueHours = sql.join(
    TICKET_PRIORITIES.map(
      (priority) =>
        sql`when ${priority} then ${TICKET_PRIORITY_DUE_HOURS[priority]}::int`,
    ),
    sql` `,
  )
  const dueAt = sql`(${ticket.createdAt} + make_interval(hours => case ${ticket.priority} ${dueHours} end))`

  const rows = await db
    .select({
      id: ticket.id,
      title: ticket.title,
      priority: ticket.priority,
      createdAt: ticket.createdAt,
    })
    .from(ticket)
    .where(
      and(
        eq(ticket.currentDepartmentId, departmentId),
        inArray(ticket.status, [...OVERDUE_TICKET_STATUSES]),
        sql`${dueAt} < ${now}`,
      ),
    )
    .orderBy(asc(dueAt), asc(ticket.createdAt), asc(ticket.id))
    .limit(limit)

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    priority: row.priority,
    dueAt: ticketDueAt({ createdAt: row.createdAt, priority: row.priority }),
  }))
}
