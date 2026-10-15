import { and, gte, lt, type SQL } from "drizzle-orm"

import type { DateRange } from "@/app/_lib/types/period"
import { ticket, ticketTransfer } from "@/db/schema"

export const ticketPeriodCondition = (
  range: DateRange | null,
): SQL | undefined =>
  range === null
    ? undefined
    : and(gte(ticket.createdAt, range.start), lt(ticket.createdAt, range.end))

export const transferPeriodCondition = (
  range: DateRange | null,
): SQL | undefined =>
  range === null
    ? undefined
    : and(
        gte(ticketTransfer.createdAt, range.start),
        lt(ticketTransfer.createdAt, range.end),
      )
