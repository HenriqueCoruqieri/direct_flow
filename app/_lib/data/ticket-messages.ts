import { and, asc, eq, or } from "drizzle-orm"

import { canViewTicket } from "@/app/_lib/domain/ticket"
import { canCommentOnTicket } from "@/app/_lib/domain/ticket-comments"
import type { TicketActorFacts } from "@/app/_lib/types/ticket"
import type {
  InsertTicketMessageOutcome,
  InsertTicketMessageValues,
  TicketMessageItem,
  TicketMessageScope,
} from "@/app/_lib/types/ticket-comments"
import { db } from "@/db"
import { department, message, ticket, user } from "@/db/schema"

export async function listTicketMessages(
  ticketId: number,
  scope: TicketMessageScope,
): Promise<TicketMessageItem[]> {
  const visibleToViewer = scope.includeInternal
    ? undefined
    : or(eq(message.visibility, "publica"), eq(message.userId, scope.viewerId))

  return db
    .select({
      id: message.id,
      authorName: user.name,
      content: message.content,
      visibility: message.visibility,
      createdAt: message.createdAt,
    })
    .from(message)
    .innerJoin(user, eq(user.id, message.userId))
    .where(and(eq(message.ticketId, ticketId), visibleToViewer))
    .orderBy(asc(message.createdAt), asc(message.id))
}

export async function insertTicketMessage(
  values: InsertTicketMessageValues,
): Promise<InsertTicketMessageOutcome> {
  const { ticketId, authorId, content, visibility } = values

  return db.transaction(async (tx) => {
    const [ticketRow] = await tx
      .select({
        createdBy: ticket.createdBy,
        assignedTo: ticket.assignedTo,
        currentDepartmentId: ticket.currentDepartmentId,
        status: ticket.status,
        resolvedAt: ticket.resolvedAt,
      })
      .from(ticket)
      .where(eq(ticket.id, ticketId))
      .for("share")

    if (!ticketRow) return { status: "not_found" }

    const now = new Date()

    const [commenterRow] = await tx
      .select({
        departmentId: user.departmentId,
        role: user.role,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
        isBoard: department.isBoard,
      })
      .from(user)
      .innerJoin(department, eq(department.id, user.departmentId))
      .where(eq(user.id, authorId))
      .for("share", { of: user })

    if (!commenterRow) return { status: "not_commentable" }

    const commenter: TicketActorFacts = {
      userId: authorId,
      departmentId: commenterRow.departmentId,
      isBoard: commenterRow.isBoard,
      role: commenterRow.role,
      isActive: commenterRow.isActive,
      mustChangePassword: commenterRow.mustChangePassword,
    }

    if (!canViewTicket(commenter, ticketRow)) return { status: "not_found" }

    if (!canCommentOnTicket(commenter, ticketRow, now)) {
      return { status: "not_commentable" }
    }

    const [created] = await tx
      .insert(message)
      .values({ ticketId, userId: authorId, content, visibility })
      .returning({ id: message.id })

    return { status: "saved", ticketId, messageId: created.id }
  })
}
