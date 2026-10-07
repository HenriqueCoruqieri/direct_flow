import { and, asc, eq, or } from "drizzle-orm"

import { canViewTicket } from "@/app/_lib/domain/ticket"
import {
  canCommentOnTicket,
  canSeeTicketMessage,
  ticketCommentEditBlockFor,
} from "@/app/_lib/domain/ticket-comments"
import type { TicketActorFacts } from "@/app/_lib/types/ticket"
import type {
  InsertTicketMessageOutcome,
  InsertTicketMessageValues,
  TicketMessageItem,
  TicketMessageScope,
  UpdateTicketMessageOutcome,
  UpdateTicketMessageValues,
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
      authorId: message.userId,
      authorName: user.name,
      content: message.content,
      visibility: message.visibility,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
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

export async function updateTicketMessage(
  values: UpdateTicketMessageValues,
): Promise<UpdateTicketMessageOutcome> {
  const { ticketId, messageId, editorId, content } = values

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

    const [editorRow] = await tx
      .select({
        departmentId: user.departmentId,
        role: user.role,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
        isBoard: department.isBoard,
      })
      .from(user)
      .innerJoin(department, eq(department.id, user.departmentId))
      .where(eq(user.id, editorId))
      .for("share", { of: user })

    if (!editorRow) return { status: "not_editable" }

    const editor: TicketActorFacts = {
      userId: editorId,
      departmentId: editorRow.departmentId,
      isBoard: editorRow.isBoard,
      role: editorRow.role,
      isActive: editorRow.isActive,
      mustChangePassword: editorRow.mustChangePassword,
    }

    if (!canViewTicket(editor, ticketRow)) return { status: "not_found" }

    const [messageRow] = await tx
      .select({
        userId: message.userId,
        content: message.content,
        visibility: message.visibility,
      })
      .from(message)
      .where(and(eq(message.id, messageId), eq(message.ticketId, ticketId)))
      .for("update")

    if (!messageRow) return { status: "not_found" }

    const author = { authorId: messageRow.userId }

    if (
      !canSeeTicketMessage(editor, ticketRow, {
        ...author,
        visibility: messageRow.visibility,
      })
    ) {
      return { status: "not_found" }
    }

    if (ticketCommentEditBlockFor(editor, ticketRow, author, now) !== null) {
      return { status: "not_editable" }
    }

    if (content === messageRow.content) return { status: "no_changes" }

    await tx
      .update(message)
      .set({ content, updatedAt: now })
      .where(eq(message.id, messageId))

    return { status: "saved", ticketId, messageId }
  })
}
