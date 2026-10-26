import { type SQL, sql } from "drizzle-orm"

import { TICKET_PRIORITIES } from "@/app/_lib/domain/ticket"
import { TICKET_PRIORITY_DUE_HOURS } from "@/app/_lib/domain/ticket-due"
import { ticket } from "@/db/schema"

const dueHours = sql.join(
  TICKET_PRIORITIES.map(
    (priority) =>
      sql`when ${priority} then ${TICKET_PRIORITY_DUE_HOURS[priority]}::int`,
  ),
  sql` `,
)

export const ticketDueAtSql: SQL<Date> = sql`(${ticket.createdAt} + make_interval(hours => case ${ticket.priority} ${dueHours} end))`
