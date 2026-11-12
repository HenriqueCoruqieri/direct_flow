import { and, asc, eq, gt, gte, inArray, isNotNull, lt, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

import {
  BACKLOG_TICKET_STATUSES,
  DASHBOARD_RESOLVED_STATUSES,
  OVERDUE_TICKET_STATUSES,
} from "@/app/_lib/domain/dashboard"
import { REJECTED_TRANSFER_STATUS } from "@/app/_lib/domain/ticket-transfer"
import type {
  DepartmentGoals,
  DepartmentGoalsRecord,
  PersonGoalFacts,
  TeamGoalFacts,
  TeamMemberGoalFacts,
  TeamProductionEntry,
} from "@/app/_lib/types/operations"
import type { DateRange } from "@/app/_lib/types/period"
import { db } from "@/db"
import { departmentGoal, ticket, ticketTransfer, user } from "@/db/schema"

const returnedTransfer = alias(ticketTransfer, "r")

function resolvedInRangeSql(month: DateRange) {
  return and(
    gte(ticket.resolvedAt, month.start),
    lt(ticket.resolvedAt, month.end),
    inArray(ticket.status, [...DASHBOARD_RESOLVED_STATUSES]),
  )
}

function goalFactColumns(month: DateRange, now: Date) {
  const resolvedInMonth = resolvedInRangeSql(month)

  return {
    resolvedCount:
      sql<number>`(count(*) filter (where ${resolvedInMonth}))::int`.as(
        "resolved_count",
      ),
    slaMetCount:
      sql<number>`(count(*) filter (where ${resolvedInMonth} and ${ticket.resolvedAt} <= ${ticket.dueAt}))::int`.as(
        "sla_met_count",
      ),
    averageResolutionMs: sql<
      number | null
    >`(avg(extract(epoch from (${ticket.resolvedAt} - ${ticket.createdAt})) * 1000) filter (where ${resolvedInMonth}))::float8`.as(
      "average_resolution_ms",
    ),
    overdueMs: monthOverdueMsSql(month, now).as("overdue_ms"),
  }
}

function monthOverdueMsSql(month: DateRange, now: Date) {
  const returnedAt = sql`(select max(${returnedTransfer.reviewedAt}) from ${ticketTransfer} ${sql.identifier("r")} where ${returnedTransfer.ticketId} = ${ticket.id} and ${returnedTransfer.status} = ${REJECTED_TRANSFER_STATUS} and ${returnedTransfer.fromDueAt} is not null)`
  const overdueStart = sql`greatest(${ticket.dueAt}, ${month.start}::timestamptz, ${returnedAt})`
  const overdueEnd = sql`case when ${inArray(ticket.status, [...DASHBOARD_RESOLVED_STATUSES])} then ${ticket.resolvedAt} else ${now}::timestamptz end`
  const overdueEligible = sql`(${isNotNull(ticket.dueAt)} and (${resolvedInRangeSql(month)} or ${inArray(ticket.status, [...OVERDUE_TICKET_STATUSES])}))`

  return sql<number>`coalesce(sum(extract(epoch from (${overdueEnd} - ${overdueStart})) * 1000) filter (where ${overdueEligible} and ${overdueEnd} > ${overdueStart}), 0)::float8`
}

function sendOverdueMsSql(month: DateRange, now: Date) {
  const prevReturnedAt = sql`(select max(${returnedTransfer.reviewedAt}) from ${ticketTransfer} ${sql.identifier("r")} where ${returnedTransfer.ticketId} = ${ticketTransfer.ticketId} and ${returnedTransfer.id} <> ${ticketTransfer.id} and ${returnedTransfer.status} = ${REJECTED_TRANSFER_STATUS} and ${returnedTransfer.fromDueAt} is not null and ${returnedTransfer.reviewedAt} <= ${ticketTransfer.createdAt})`
  const sendStart = sql`greatest(${ticketTransfer.fromDueAt}, ${month.start}::timestamptz, ${prevReturnedAt})`
  const sendEnd = sql`least(${ticketTransfer.createdAt}, ${now}::timestamptz)`

  return sql<number>`coalesce(sum(extract(epoch from (${sendEnd} - ${sendStart})) * 1000) filter (where ${sendEnd} > ${sendStart}), 0)::float8`
}

function sendOverdueWhere(departmentId: number, month: DateRange) {
  return and(
    eq(ticketTransfer.fromDepartmentId, departmentId),
    isNotNull(ticketTransfer.fromDueAt),
    gt(ticketTransfer.createdAt, month.start),
  )
}

export async function findDepartmentGoals(
  departmentId: number,
): Promise<DepartmentGoalsRecord | null> {
  const [row] = await db
    .select({
      departmentId: departmentGoal.departmentId,
      slaMinPercent: departmentGoal.slaMinPercent,
      tmaMaxHours: departmentGoal.tmaMaxHours,
      overdueHoursLimit: departmentGoal.overdueHoursLimit,
      backlogLimit: departmentGoal.backlogLimit,
      transferAcceptanceMinPercent: departmentGoal.transferAcceptanceMinPercent,
      updatedAt: departmentGoal.updatedAt,
      updatedByName: user.name,
    })
    .from(departmentGoal)
    .leftJoin(user, eq(departmentGoal.updatedBy, user.id))
    .where(eq(departmentGoal.departmentId, departmentId))
    .limit(1)

  return row ?? null
}

export async function upsertDepartmentGoals(
  departmentId: number,
  goals: DepartmentGoals,
  actorId: number,
): Promise<void> {
  const limits = {
    slaMinPercent: goals.slaMinPercent,
    tmaMaxHours: goals.tmaMaxHours,
    overdueHoursLimit: goals.overdueHoursLimit,
    backlogLimit: goals.backlogLimit,
    transferAcceptanceMinPercent: goals.transferAcceptanceMinPercent,
    updatedBy: actorId,
  }

  await db
    .insert(departmentGoal)
    .values({ departmentId, ...limits })
    .onConflictDoUpdate({
      target: departmentGoal.departmentId,
      set: { ...limits, updatedAt: new Date() },
    })
}

export async function findPersonGoalFacts(
  departmentId: number,
  userId: number,
  month: DateRange,
  now: Date,
): Promise<PersonGoalFacts> {
  const [[row], [sent]] = await Promise.all([
    db
      .select(goalFactColumns(month, now))
      .from(ticket)
      .where(
        and(
          eq(ticket.currentDepartmentId, departmentId),
          eq(ticket.assignedTo, userId),
        ),
      ),
    db
      .select({ overdueMs: sendOverdueMsSql(month, now) })
      .from(ticketTransfer)
      .where(
        and(
          sendOverdueWhere(departmentId, month),
          eq(ticketTransfer.fromAssigneeId, userId),
        ),
      ),
  ])

  return {
    resolvedCount: row?.resolvedCount ?? 0,
    slaMetCount: row?.slaMetCount ?? 0,
    averageResolutionMs: row?.averageResolutionMs ?? null,
    overdueMs: (row?.overdueMs ?? 0) + (sent?.overdueMs ?? 0),
  }
}

export async function findTeamGoalFacts(
  departmentId: number,
  month: DateRange,
  now: Date,
): Promise<TeamGoalFacts> {
  const inDepartment = eq(ticket.currentDepartmentId, departmentId)
  const isBacklog = inArray(ticket.status, [...BACKLOG_TICKET_STATUSES])

  const perAssignee = db
    .select({
      assignedTo: ticket.assignedTo,
      ...goalFactColumns(month, now),
    })
    .from(ticket)
    .where(inDepartment)
    .groupBy(ticket.assignedTo)
    .as("goal_facts")

  const [teamRows, transferRows, memberRows, sentTeamRows, sentMemberRows] =
    await Promise.all([
      db
        .select({
          ...goalFactColumns(month, now),
          backlogCount:
            sql<number>`(count(*) filter (where ${isBacklog}))::int`.as(
              "backlog_count",
            ),
        })
        .from(ticket)
        .where(inDepartment),
      db
        .select({
          approvedCount: sql<number>`(count(*) filter (where ${eq(ticketTransfer.status, "aprovado")}))::int`,
          rejectedCount: sql<number>`(count(*) filter (where ${eq(ticketTransfer.status, "rejeitado")}))::int`,
        })
        .from(ticketTransfer)
        .where(
          and(
            eq(ticketTransfer.toDepartmentId, departmentId),
            gte(ticketTransfer.reviewedAt, month.start),
            lt(ticketTransfer.reviewedAt, month.end),
          ),
        ),
      db
        .select({
          userId: user.id,
          name: user.name,
          image: user.image,
          resolvedCount: sql<number>`coalesce(${perAssignee.resolvedCount}, 0)::int`,
          slaMetCount: sql<number>`coalesce(${perAssignee.slaMetCount}, 0)::int`,
          averageResolutionMs: perAssignee.averageResolutionMs,
          overdueMs: sql<number>`coalesce(${perAssignee.overdueMs}, 0)::float8`,
        })
        .from(user)
        .leftJoin(perAssignee, eq(perAssignee.assignedTo, user.id))
        .where(
          and(eq(user.departmentId, departmentId), eq(user.isActive, true)),
        )
        .orderBy(asc(sql`lower(${user.name})`), asc(user.id)),
      db
        .select({ overdueMs: sendOverdueMsSql(month, now) })
        .from(ticketTransfer)
        .where(sendOverdueWhere(departmentId, month)),
      db
        .select({
          userId: ticketTransfer.fromAssigneeId,
          overdueMs: sendOverdueMsSql(month, now),
        })
        .from(ticketTransfer)
        .where(
          and(
            sendOverdueWhere(departmentId, month),
            isNotNull(ticketTransfer.fromAssigneeId),
          ),
        )
        .groupBy(ticketTransfer.fromAssigneeId),
    ])

  const team = teamRows[0]
  const transfers = transferRows[0]
  const sentOverdueByUser = new Map<number, number>()
  for (const sent of sentMemberRows) {
    if (sent.userId !== null) sentOverdueByUser.set(sent.userId, sent.overdueMs)
  }
  const members: TeamMemberGoalFacts[] = memberRows.map((member) => ({
    userId: member.userId,
    name: member.name,
    image: member.image,
    resolvedCount: member.resolvedCount,
    slaMetCount: member.slaMetCount,
    averageResolutionMs: member.averageResolutionMs ?? null,
    overdueMs: member.overdueMs + (sentOverdueByUser.get(member.userId) ?? 0),
  }))

  return {
    resolvedCount: team?.resolvedCount ?? 0,
    slaMetCount: team?.slaMetCount ?? 0,
    averageResolutionMs: team?.averageResolutionMs ?? null,
    overdueMs: (team?.overdueMs ?? 0) + (sentTeamRows[0]?.overdueMs ?? 0),
    backlogCount: team?.backlogCount ?? 0,
    approvedCount: transfers?.approvedCount ?? 0,
    rejectedCount: transfers?.rejectedCount ?? 0,
    members,
  }
}

export async function findTeamProduction(
  departmentId: number,
  range: DateRange,
): Promise<TeamProductionEntry[]> {
  const resolvedCount = sql<number>`(count(${ticket.id}))::int`

  return db
    .select({
      userId: user.id,
      name: user.name,
      image: user.image,
      resolvedCount,
    })
    .from(user)
    .leftJoin(
      ticket,
      and(
        eq(ticket.assignedTo, user.id),
        eq(ticket.currentDepartmentId, departmentId),
        resolvedInRangeSql(range),
      ),
    )
    .where(and(eq(user.departmentId, departmentId), eq(user.isActive, true)))
    .groupBy(user.id)
    .orderBy(
      sql`${resolvedCount} desc`,
      asc(sql`lower(${user.name})`),
      asc(user.id),
    )
}
