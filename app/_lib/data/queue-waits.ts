import { and, eq, isNull } from "drizzle-orm"

import type { OpenQueueWaitValues } from "@/app/_lib/types/queue-wait"
import type { Transaction } from "@/db"
import { ticketQueueWait } from "@/db/schema"

export async function openQueueWait(
  tx: Transaction,
  values: OpenQueueWaitValues,
): Promise<void> {
  await tx.insert(ticketQueueWait).values({
    ticketId: values.ticketId,
    departmentId: values.departmentId,
    reason: values.reason,
    startedAt: values.startedAt,
  })
}

export async function closeOpenQueueWait(
  tx: Transaction,
  ticketId: number,
  endedAt: Date,
): Promise<void> {
  await tx
    .update(ticketQueueWait)
    .set({ endedAt, updatedAt: endedAt })
    .where(
      and(
        eq(ticketQueueWait.ticketId, ticketId),
        isNull(ticketQueueWait.endedAt),
      ),
    )
}
