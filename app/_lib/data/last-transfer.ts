import {
  type AnyColumn,
  desc,
  eq,
  getTableName,
  type SQL,
  sql,
} from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

import { db } from "@/db"
import { ticketTransfer } from "@/db/schema"

const LT_ALIAS = "lt"

const lastTransferOrder = (transfer: Record<"createdAt" | "id", AnyColumn>) => [
  desc(transfer.createdAt),
  desc(transfer.id),
]

export const lastTransferRequestedBySql = (
  ticketId: AnyColumn,
): SQL<number | null> => {
  const lt = alias(ticketTransfer, LT_ALIAS)
  const outerTicketId = sql`${sql.identifier(getTableName(ticketId.table))}.${sql.identifier(ticketId.name)}`

  return sql<
    number | null
  >`(select ${lt.requestedBy} from ${ticketTransfer} as ${sql.identifier(LT_ALIAS)} where ${eq(lt.ticketId, outerTicketId)} order by ${sql.join(lastTransferOrder(lt), sql`, `)} limit 1)`
}

export const lastTransferTable = () =>
  db
    .selectDistinctOn([ticketTransfer.ticketId], {
      ticketId: ticketTransfer.ticketId,
      requestedBy: ticketTransfer.requestedBy,
      status: ticketTransfer.status,
      reviewedBy: ticketTransfer.reviewedBy,
    })
    .from(ticketTransfer)
    .orderBy(ticketTransfer.ticketId, ...lastTransferOrder(ticketTransfer))
    .as("last_transfer")
