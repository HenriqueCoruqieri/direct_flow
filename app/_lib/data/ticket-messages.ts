import { and, asc, eq, or } from "drizzle-orm"

import { lockActorFacts } from "@/app/_lib/data/actor-facts"
import { canViewTicket } from "@/app/_lib/domain/ticket"
import {
  canCommentOnTicket,
  canDeleteTicketComment,
  canSeeTicketMessage,
  ticketCommentEditBlockFor,
} from "@/app/_lib/domain/ticket-comments"
import type {
  DeleteTicketMessageOutcome,
  DeleteTicketMessageValues,
  InsertTicketMessageOutcome,
  InsertTicketMessageValues,
  TicketMessageItem,
  TicketMessageScope,
  UpdateTicketMessageOutcome,
  UpdateTicketMessageValues,
} from "@/app/_lib/types/ticket-comments"
import { db } from "@/db"
import { message, ticket, user } from "@/db/schema"

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

    const commenter = await lockActorFacts(tx, authorId)

    if (!commenter) return { status: "not_commentable" }

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

    const editor = await lockActorFacts(tx, editorId)

    if (!editor) return { status: "not_editable" }

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

export async function deleteTicketMessage(
  values: DeleteTicketMessageValues,
): Promise<DeleteTicketMessageOutcome> {
  const { ticketId, messageId, actorId } = values

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

    const actor = await lockActorFacts(tx, actorId)

    if (!actor) return { status: "not_deletable" }

    if (!canViewTicket(actor, ticketRow)) return { status: "not_found" }

    const [messageRow] = await tx
      .select({ userId: message.userId, visibility: message.visibility })
      .from(message)
      .where(and(eq(message.id, messageId), eq(message.ticketId, ticketId)))
      .for("update")

    if (!messageRow) return { status: "not_found" }

    const author = { authorId: messageRow.userId }

    if (
      !canSeeTicketMessage(actor, ticketRow, {
        ...author,
        visibility: messageRow.visibility,
      })
    ) {
      return { status: "not_found" }
    }

    if (!canDeleteTicketComment(actor, ticketRow, author, now)) {
      return { status: "not_deletable" }
    }

    await tx
      .delete(message)
      .where(and(eq(message.id, messageId), eq(message.ticketId, ticketId)))

    return { status: "deleted", ticketId, messageId }
  })
}
