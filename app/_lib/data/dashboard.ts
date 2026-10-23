import { and, count, eq, gte, inArray, lt, sql } from "drizzle-orm"

import {
  BACKLOG_TICKET_STATUSES,
  DASHBOARD_RESOLVED_STATUSES,
} from "@/app/_lib/domain/dashboard"
import type { DashboardOverview } from "@/app/_lib/types/dashboard"
import type { DateRange } from "@/app/_lib/types/period"
import { db } from "@/db"
import { ticket, ticketTransfer } from "@/db/schema"

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
