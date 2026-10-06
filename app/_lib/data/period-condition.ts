import { and, gte, lt, type SQL } from "drizzle-orm"

import type { DateRange } from "@/app/_lib/types/period"
import { ticket } from "@/db/schema"

export const ticketPeriodCondition = (
  range: DateRange | null,
): SQL | undefined =>
  range === null
    ? undefined
    : and(gte(ticket.createdAt, range.start), lt(ticket.createdAt, range.end))
