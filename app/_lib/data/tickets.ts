import { eq } from "drizzle-orm"

import {
  canReceiveTickets,
  INITIAL_TICKET_PRIORITY,
  initialTicketStatusFor,
  isUsableTicketTag,
  requiresApproval,
} from "@/app/_lib/domain/ticket"
import type {
  InsertTicketOutcome,
  InsertTicketValues,
} from "@/app/_lib/types/ticket"
import { db } from "@/db"
import {
  department,
  tag,
  ticket,
  ticketHistory,
  ticketTag,
  ticketTransfer,
} from "@/db/schema"

export async function insertTicket(
  values: InsertTicketValues,
): Promise<InsertTicketOutcome> {
  return db.transaction(async (tx) => {
    const [tagRow] = await tx
      .select({ departmentId: tag.departmentId, isActive: tag.isActive })
      .from(tag)
      .where(eq(tag.id, values.tagId))
      .for("share")

    if (!tagRow || !isUsableTicketTag(tagRow, values.originDepartmentId)) {
      return { status: "invalid_tag" }
    }

    const [departmentRow] = await tx
      .select({
        name: department.name,
        isActive: department.isActive,
        isUnassigned: department.isUnassigned,
      })
      .from(department)
      .where(eq(department.id, values.destinationDepartmentId))
      .for("share")

    if (!departmentRow || !canReceiveTickets(departmentRow)) {
      return { status: "invalid_destination" }
    }

    const ticketStatus = initialTicketStatusFor(
      values.originDepartmentId,
      values.destinationDepartmentId,
    )

    const [created] = await tx
      .insert(ticket)
      .values({
        title: values.title,
        description: values.description,
        type: values.type,
        status: ticketStatus,
        priority: INITIAL_TICKET_PRIORITY,
        createdBy: values.createdBy,
        originDepartmentId: values.originDepartmentId,
        currentDepartmentId: values.originDepartmentId,
      })
      .returning({ id: ticket.id, createdAt: ticket.createdAt })

    await tx.insert(ticketTag).values({
      ticketId: created.id,
      tagId: values.tagId,
      createdAt: created.createdAt,
    })

    await tx.insert(ticketHistory).values({
      ticketId: created.id,
      changedBy: values.createdBy,
      event: "criacao",
      toStatus: ticketStatus,
      toPriority: INITIAL_TICKET_PRIORITY,
      toDepartmentId: values.originDepartmentId,
      changedAt: created.createdAt,
    })

    if (
      requiresApproval(
        values.originDepartmentId,
        values.destinationDepartmentId,
      )
    ) {
      await tx.insert(ticketTransfer).values({
        ticketId: created.id,
        fromDepartmentId: values.originDepartmentId,
        toDepartmentId: values.destinationDepartmentId,
        requestedBy: values.createdBy,
        createdAt: created.createdAt,
      })

      await tx.insert(ticketHistory).values({
        ticketId: created.id,
        changedBy: values.createdBy,
        event: "transferencia_solicitada",
        fromDepartmentId: values.originDepartmentId,
        toDepartmentId: values.destinationDepartmentId,
        changedAt: created.createdAt,
      })
    }

    return {
      status: "saved",
      ticketId: created.id,
      ticketStatus,
      destinationDepartmentName: departmentRow.name,
    }
  })
}
