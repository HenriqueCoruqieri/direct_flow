import { and, desc, eq, ilike, or, type SQL, sql } from "drizzle-orm"

import type { TicketViewerFacts } from "@/app/_lib/types/ticket"
import type {
  TicketSearchQuery,
  TicketSearchResult,
} from "@/app/_lib/types/ticket-search"
import { db } from "@/db"
import { ticket } from "@/db/schema"

const visibilityCondition = (viewer: TicketViewerFacts): SQL | undefined => {
  if (viewer.isBoard) return undefined
  return or(
    eq(ticket.createdBy, viewer.userId),
    eq(ticket.assignedTo, viewer.userId),
    eq(ticket.currentDepartmentId, viewer.departmentId),
  )
}

const escapeLikePattern = (text: string): string =>
  text.replace(/[\\%_]/g, "\\$&")

const termCondition = (query: TicketSearchQuery): SQL =>
  query.mode === "number"
    ? sql`${ticket.id}::text like ${`${query.digits}%`}`
    : ilike(ticket.title, `%${escapeLikePattern(query.text)}%`)

const searchOrder = (query: TicketSearchQuery): SQL[] =>
  query.mode === "number"
    ? [sql`(${ticket.id}::text = ${query.digits}) desc`, desc(ticket.id)]
    : [desc(ticket.id)]

export async function searchVisibleTickets(
  viewer: TicketViewerFacts,
  query: TicketSearchQuery,
  limit: number,
): Promise<TicketSearchResult[]> {
  return db
    .select({ id: ticket.id, title: ticket.title, status: ticket.status })
    .from(ticket)
    .where(and(visibilityCondition(viewer), termCondition(query)))
    .orderBy(...searchOrder(query))
    .limit(limit)
}
