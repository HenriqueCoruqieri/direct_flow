import { and, asc, count, desc, eq, gte, inArray, lt, sql } from "drizzle-orm"
import { unionAll } from "drizzle-orm/pg-core"

import { countPendingApprovals } from "@/app/_lib/data/approvals"
import { ticketDueAtSql } from "@/app/_lib/data/ticket-due"
import {
  BACKLOG_TICKET_STATUSES,
  DASHBOARD_RESOLVED_STATUSES,
  OVERDUE_TICKET_STATUSES,
} from "@/app/_lib/domain/dashboard"
import { ticketDueAt } from "@/app/_lib/domain/ticket-due"
import {
  PENDING_TRANSFER_STATUS,
  REJECTED_TRANSFER_STATUS,
} from "@/app/_lib/domain/ticket-transfer"
import type {
  DashboardActivityCount,
  DashboardIncomingTransfer,
  DashboardOverdueTicket,
  DashboardOverviewByMode,
  DashboardTopTags,
  DashboardTransferSummary,
} from "@/app/_lib/types/dashboard"
import type { DateRange, TimeBucket } from "@/app/_lib/types/period"
import { db } from "@/db"
import { department, tag, ticket, ticketTag, ticketTransfer } from "@/db/schema"

export async function findDashboardOverview(
  departmentId: number,
  range: DateRange,
  now: Date,
  userId: number,
): Promise<DashboardOverviewByMode> {
  const createdInRange = and(
    gte(ticket.createdAt, range.start),
    lt(ticket.createdAt, range.end),
  )
  const resolvedInRange = and(
    gte(ticket.resolvedAt, range.start),
    lt(ticket.resolvedAt, range.end),
  )
  const acceptedInRange = and(
    eq(ticketTransfer.toDepartmentId, departmentId),
    eq(ticketTransfer.status, "aprovado"),
    gte(ticketTransfer.reviewedAt, range.start),
    lt(ticketTransfer.reviewedAt, range.end),
  )
  const isResolvedStatus = inArray(ticket.status, [
    ...DASHBOARD_RESOLVED_STATUSES,
  ])
  const isBacklogStatus = inArray(ticket.status, [...BACKLOG_TICKET_STATUSES])

  const isMine = eq(ticket.assignedTo, userId)
  const isMineInDepartment = and(
    isMine,
    eq(ticket.currentDepartmentId, departmentId),
  )

  const received = unionAll(
    db
      .select({
        ticketId: ticket.id,
        mine: sql<boolean | null>`${isMineInDepartment}`.as("mine"),
      })
      .from(ticket)
      .where(and(eq(ticket.originDepartmentId, departmentId), createdInRange)),
    db
      .select({
        ticketId: ticketTransfer.ticketId,
        mine: sql<boolean | null>`${isMineInDepartment}`.as("mine"),
      })
      .from(ticketTransfer)
      .innerJoin(ticket, eq(ticket.id, ticketTransfer.ticketId))
      .where(acceptedInRange),
  ).as("received")

  const [ticketRows, transferRows, receivedRows] = await Promise.all([
    db
      .select({
        ticketCount: sql<number>`(count(*) filter (where ${createdInRange}))::int`,
        periodResolvedCount: sql<number>`(count(*) filter (where ${resolvedInRange} and ${isResolvedStatus}))::int`,
        averageResolutionMs: sql<
          string | null
        >`avg(extract(epoch from (${ticket.resolvedAt} - ${ticket.createdAt})) * 1000) filter (where ${resolvedInRange} and ${isResolvedStatus})`,
        backlogCount: sql<number>`(count(*) filter (where ${isBacklogStatus}))::int`,
        backlogAgeMs: sql<
          string | null
        >`coalesce(sum(extract(epoch from greatest(${now}::timestamptz - ${ticket.createdAt}, interval '0')) * 1000) filter (where ${isBacklogStatus}), 0)`,
        overdueBacklogCount: sql<number>`(count(*) filter (where ${isBacklogStatus} and ${ticketDueAtSql} < ${now}))::int`,
        mineTicketCount: sql<number>`(count(*) filter (where ${createdInRange} and ${isMine}))::int`,
        minePeriodResolvedCount: sql<number>`(count(*) filter (where ${resolvedInRange} and ${isResolvedStatus} and ${isMine}))::int`,
        mineAverageResolutionMs: sql<
          string | null
        >`avg(extract(epoch from (${ticket.resolvedAt} - ${ticket.createdAt})) * 1000) filter (where ${resolvedInRange} and ${isResolvedStatus} and ${isMine})`,
        mineBacklogCount: sql<number>`(count(*) filter (where ${isBacklogStatus} and ${isMine}))::int`,
        mineBacklogAgeMs: sql<
          string | null
        >`coalesce(sum(extract(epoch from greatest(${now}::timestamptz - ${ticket.createdAt}, interval '0')) * 1000) filter (where ${isBacklogStatus} and ${isMine}), 0)`,
        mineOverdueBacklogCount: sql<number>`(count(*) filter (where ${isBacklogStatus} and ${ticketDueAtSql} < ${now} and ${isMine}))::int`,
      })
      .from(ticket)
      .where(eq(ticket.currentDepartmentId, departmentId)),
    db
      .select({
        value: sql<number>`(${count()})::int`,
        mineValue: sql<number>`(count(*) filter (where ${eq(ticketTransfer.reviewedBy, userId)}))::int`,
      })
      .from(ticketTransfer)
      .where(acceptedInRange),
    db
      .select({
        value: sql<number>`(count(distinct ${received.ticketId}))::int`,
        mineValue: sql<number>`(count(distinct ${received.ticketId}) filter (where ${received.mine}))::int`,
      })
      .from(received),
  ])

  const ticketRow = ticketRows[0]
  const averageResolutionMs = ticketRow?.averageResolutionMs ?? null
  const mineAverageResolutionMs = ticketRow?.mineAverageResolutionMs ?? null

  return {
    coletivo: {
      ticketCount: ticketRow?.ticketCount ?? 0,
      receivedTransferCount: transferRows[0]?.value ?? 0,
      periodReceivedCount: receivedRows[0]?.value ?? 0,
      periodResolvedCount: ticketRow?.periodResolvedCount ?? 0,
      averageResolutionMs:
        averageResolutionMs === null ? null : Number(averageResolutionMs),
      backlogCount: ticketRow?.backlogCount ?? 0,
      backlogAgeMs: Number(ticketRow?.backlogAgeMs ?? 0),
      overdueBacklogCount: ticketRow?.overdueBacklogCount ?? 0,
    },
    individual: {
      ticketCount: ticketRow?.mineTicketCount ?? 0,
      receivedTransferCount: transferRows[0]?.mineValue ?? 0,
      periodReceivedCount: receivedRows[0]?.mineValue ?? 0,
      periodResolvedCount: ticketRow?.minePeriodResolvedCount ?? 0,
      averageResolutionMs:
        mineAverageResolutionMs === null
          ? null
          : Number(mineAverageResolutionMs),
      backlogCount: ticketRow?.mineBacklogCount ?? 0,
      backlogAgeMs: Number(ticketRow?.mineBacklogAgeMs ?? 0),
      overdueBacklogCount: ticketRow?.mineOverdueBacklogCount ?? 0,
    },
  }
}

export async function listDashboardTopTags(
  departmentId: number,
  range: DateRange,
  limit: number,
  assigneeId?: number,
): Promise<DashboardTopTags> {
  const createdInRange = and(
    eq(ticket.currentDepartmentId, departmentId),
    assigneeId === undefined ? undefined : eq(ticket.assignedTo, assigneeId),
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
        sql`${ticketDueAtSql} < ${now}`,
      ),
    )
    .orderBy(asc(ticketDueAtSql), asc(ticket.createdAt), asc(ticket.id))
    .limit(limit)

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    priority: row.priority,
    dueAt: ticketDueAt({ createdAt: row.createdAt, priority: row.priority }),
  }))
}

interface ActivityCountRow extends Record<string, unknown> {
  bucketKey: string
  openedCount: number
  resolvedCount: number
}

export async function listActivityBuckets(
  departmentId: number,
  buckets: readonly TimeBucket[],
): Promise<DashboardActivityCount[]> {
  if (buckets.length === 0) return []

  const bucketRows = sql.join(
    buckets.map(
      (bucket) =>
        sql`(${bucket.key}::text, ${bucket.start.toISOString()}::timestamptz, ${bucket.end.toISOString()}::timestamptz)`,
    ),
    sql`, `,
  )
  const resolvedStatuses = sql.join(
    DASHBOARD_RESOLVED_STATUSES.map((status) => sql`${status}`),
    sql`, `,
  )

  const result = await db.execute<ActivityCountRow>(sql`
    select b.bucket_key as "bucketKey",
      (count(t.id) filter (
        where t.created_at >= b.bucket_start and t.created_at < b.bucket_end
      ))::int as "openedCount",
      (count(t.id) filter (
        where t.resolved_at >= b.bucket_start and t.resolved_at < b.bucket_end
          and t.status in (${resolvedStatuses})
      ))::int as "resolvedCount"
    from (values ${bucketRows}) as b(bucket_key, bucket_start, bucket_end)
    left join ${ticket} t
      on t.current_department_id = ${departmentId}
      and (
        (t.created_at >= b.bucket_start and t.created_at < b.bucket_end)
        or (t.resolved_at >= b.bucket_start and t.resolved_at < b.bucket_end)
      )
    group by b.bucket_key
    order by b.bucket_key
  `)

  return result.rows.map((row) => ({
    key: row.bucketKey,
    openedCount: row.openedCount,
    resolvedCount: row.resolvedCount,
  }))
}

export async function findTransferSummary(
  departmentId: number,
  range: DateRange,
): Promise<DashboardTransferSummary> {
  const isPending = eq(ticketTransfer.status, PENDING_TRANSFER_STATUS)
  const isRejectedInRange = and(
    eq(ticketTransfer.status, REJECTED_TRANSFER_STATUS),
    gte(ticketTransfer.reviewedAt, range.start),
    lt(ticketTransfer.reviewedAt, range.end),
  )

  const [incomingPendingCount, outgoingRows] = await Promise.all([
    countPendingApprovals(departmentId),
    db
      .select({
        outgoingPendingCount: sql<number>`(count(*) filter (where ${isPending}))::int`,
        rejectedCount: sql<number>`(count(*) filter (where ${isRejectedInRange}))::int`,
      })
      .from(ticketTransfer)
      .where(eq(ticketTransfer.fromDepartmentId, departmentId)),
  ])

  return {
    incomingPendingCount,
    outgoingPendingCount: outgoingRows[0]?.outgoingPendingCount ?? 0,
    rejectedCount: outgoingRows[0]?.rejectedCount ?? 0,
  }
}

export async function listOldestIncomingTransfers(
  departmentId: number,
  limit: number,
): Promise<DashboardIncomingTransfer[]> {
  return db
    .select({
      transferId: ticketTransfer.id,
      ticketId: ticket.id,
      ticketTitle: ticket.title,
      fromDepartmentName: department.name,
      sentAt: ticketTransfer.createdAt,
    })
    .from(ticketTransfer)
    .innerJoin(department, eq(department.id, ticketTransfer.fromDepartmentId))
    .innerJoin(ticket, eq(ticket.id, ticketTransfer.ticketId))
    .where(
      and(
        eq(ticketTransfer.toDepartmentId, departmentId),
        eq(ticketTransfer.status, PENDING_TRANSFER_STATUS),
      ),
    )
    .orderBy(asc(ticketTransfer.createdAt), asc(ticketTransfer.id))
    .limit(limit)
}
