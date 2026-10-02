import { and, asc, eq } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

import {
  canViewTicket,
  INITIAL_TICKET_PRIORITY,
  INITIAL_TICKET_STATUS,
  isUsableTicketTag,
} from "@/app/_lib/domain/ticket"
import {
  canEditTicket,
  describeTicketEditNote,
  diffTicketEdit,
  hasTicketEditChanges,
} from "@/app/_lib/domain/ticket-edit"
import type {
  InsertTicketOutcome,
  InsertTicketValues,
  TicketDetail,
} from "@/app/_lib/types/ticket"
import type {
  TicketEditorFacts,
  UpdateTicketByAuthorOutcome,
  UpdateTicketByAuthorValues,
} from "@/app/_lib/types/ticket-edit"
import { db } from "@/db"
import {
  department,
  tag,
  ticket,
  ticketHistory,
  ticketTag,
  ticketTransfer,
  user,
} from "@/db/schema"

export async function findTicketDetail(
  id: number,
): Promise<TicketDetail | null> {
  const author = alias(user, "author")
  const assignee = alias(user, "assignee")
  const originDepartment = alias(department, "origin_department")
  const currentDepartment = alias(department, "current_department")

  const transferFrom = alias(department, "transfer_from")
  const transferTo = alias(department, "transfer_to")
  const requester = alias(user, "requester")

  const changer = alias(user, "changer")
  const fromDepartment = alias(department, "history_from_department")
  const toDepartment = alias(department, "history_to_department")
  const fromAssignee = alias(user, "history_from_assignee")
  const toAssignee = alias(user, "history_to_assignee")
  const fromTag = alias(tag, "history_from_tag")
  const toTag = alias(tag, "history_to_tag")

  const [ticketRows, transferRows, historyRows] = await Promise.all([
    db
      .select({
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        type: ticket.type,
        status: ticket.status,
        priority: ticket.priority,
        createdBy: ticket.createdBy,
        assignedTo: ticket.assignedTo,
        authorName: author.name,
        assigneeName: assignee.name,
        originDepartmentId: ticket.originDepartmentId,
        originDepartmentName: originDepartment.name,
        currentDepartmentId: ticket.currentDepartmentId,
        currentDepartmentName: currentDepartment.name,
        tagId: tag.id,
        tagName: tag.name,
        createdAt: ticket.createdAt,
      })
      .from(ticket)
      .innerJoin(author, eq(author.id, ticket.createdBy))
      .leftJoin(assignee, eq(assignee.id, ticket.assignedTo))
      .innerJoin(
        originDepartment,
        eq(originDepartment.id, ticket.originDepartmentId),
      )
      .innerJoin(
        currentDepartment,
        eq(currentDepartment.id, ticket.currentDepartmentId),
      )
      .leftJoin(ticketTag, eq(ticketTag.ticketId, ticket.id))
      .leftJoin(tag, eq(tag.id, ticketTag.tagId))
      .where(eq(ticket.id, id))
      .limit(1),
    db
      .select({
        id: ticketTransfer.id,
        fromDepartmentName: transferFrom.name,
        toDepartmentId: ticketTransfer.toDepartmentId,
        toDepartmentName: transferTo.name,
        requestedByName: requester.name,
        requestedAt: ticketTransfer.createdAt,
        requestReason: ticketTransfer.requestReason,
      })
      .from(ticketTransfer)
      .innerJoin(
        transferFrom,
        eq(transferFrom.id, ticketTransfer.fromDepartmentId),
      )
      .innerJoin(transferTo, eq(transferTo.id, ticketTransfer.toDepartmentId))
      .innerJoin(requester, eq(requester.id, ticketTransfer.requestedBy))
      .where(
        and(
          eq(ticketTransfer.ticketId, id),
          eq(ticketTransfer.status, "pendente"),
        ),
      )
      .limit(1),
    db
      .select({
        id: ticketHistory.id,
        event: ticketHistory.event,
        changedAt: ticketHistory.changedAt,
        changedByName: changer.name,
        fromStatus: ticketHistory.fromStatus,
        toStatus: ticketHistory.toStatus,
        fromPriority: ticketHistory.fromPriority,
        toPriority: ticketHistory.toPriority,
        fromDepartmentName: fromDepartment.name,
        toDepartmentName: toDepartment.name,
        fromAssigneeName: fromAssignee.name,
        toAssigneeName: toAssignee.name,
        fromTagName: fromTag.name,
        toTagName: toTag.name,
        note: ticketHistory.note,
      })
      .from(ticketHistory)
      .innerJoin(changer, eq(changer.id, ticketHistory.changedBy))
      .leftJoin(
        fromDepartment,
        eq(fromDepartment.id, ticketHistory.fromDepartmentId),
      )
      .leftJoin(toDepartment, eq(toDepartment.id, ticketHistory.toDepartmentId))
      .leftJoin(fromAssignee, eq(fromAssignee.id, ticketHistory.fromAssigneeId))
      .leftJoin(toAssignee, eq(toAssignee.id, ticketHistory.toAssigneeId))
      .leftJoin(fromTag, eq(fromTag.id, ticketHistory.fromTagId))
      .leftJoin(toTag, eq(toTag.id, ticketHistory.toTagId))
      .where(eq(ticketHistory.ticketId, id))
      .orderBy(asc(ticketHistory.changedAt), asc(ticketHistory.id)),
  ])

  const ticketRow = ticketRows[0]
  if (!ticketRow) return null

  return {
    ...ticketRow,
    pendingTransfer: transferRows[0] ?? null,
    history: historyRows,
  }
}

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

    const [created] = await tx
      .insert(ticket)
      .values({
        title: values.title,
        description: values.description,
        type: values.type,
        status: INITIAL_TICKET_STATUS,
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
      toStatus: INITIAL_TICKET_STATUS,
      toPriority: INITIAL_TICKET_PRIORITY,
      toDepartmentId: values.originDepartmentId,
      changedAt: created.createdAt,
    })

    return { status: "saved", ticketId: created.id }
  })
}

export async function updateTicketByAuthor(
  values: UpdateTicketByAuthorValues,
): Promise<UpdateTicketByAuthorOutcome> {
  const { ticketId, authorId } = values

  return db.transaction(async (tx) => {
    const [ticketRow] = await tx
      .select({
        createdBy: ticket.createdBy,
        assignedTo: ticket.assignedTo,
        currentDepartmentId: ticket.currentDepartmentId,
        status: ticket.status,
        title: ticket.title,
        description: ticket.description,
        type: ticket.type,
      })
      .from(ticket)
      .where(eq(ticket.id, ticketId))
      .for("update")

    if (!ticketRow) return { status: "not_found" }

    const [authorRow] = await tx
      .select({
        departmentId: user.departmentId,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
        isBoard: department.isBoard,
      })
      .from(user)
      .innerJoin(department, eq(department.id, user.departmentId))
      .where(eq(user.id, authorId))
      .for("share", { of: user })

    if (!authorRow) return { status: "not_editable" }

    const editor: TicketEditorFacts = {
      userId: authorId,
      departmentId: authorRow.departmentId,
      isBoard: authorRow.isBoard,
      isActive: authorRow.isActive,
      mustChangePassword: authorRow.mustChangePassword,
    }

    if (!canViewTicket(editor, ticketRow)) return { status: "not_found" }

    const [pendingTransfer] = await tx
      .select({ id: ticketTransfer.id })
      .from(ticketTransfer)
      .where(
        and(
          eq(ticketTransfer.ticketId, ticketId),
          eq(ticketTransfer.status, "pendente"),
        ),
      )
      .limit(1)

    if (
      !canEditTicket(editor, {
        createdBy: ticketRow.createdBy,
        currentDepartmentId: ticketRow.currentDepartmentId,
        status: ticketRow.status,
        hasPendingTransfer: pendingTransfer !== undefined,
      })
    ) {
      return { status: "not_editable" }
    }

    const [currentTagRow] = await tx
      .select({ tagId: ticketTag.tagId })
      .from(ticketTag)
      .where(eq(ticketTag.ticketId, ticketId))

    const [chosenTagRow] = await tx
      .select({ departmentId: tag.departmentId, isActive: tag.isActive })
      .from(tag)
      .where(eq(tag.id, values.tagId))
      .for("share")

    if (
      !chosenTagRow ||
      !isUsableTicketTag(chosenTagRow, editor.departmentId)
    ) {
      return { status: "invalid_tag" }
    }

    const changes = diffTicketEdit(
      {
        title: ticketRow.title,
        description: ticketRow.description,
        type: ticketRow.type,
        tagId: currentTagRow?.tagId ?? null,
      },
      values,
    )

    if (!hasTicketEditChanges(changes)) return { status: "no_changes" }

    const changedAt = new Date()

    await tx
      .update(ticket)
      .set({
        title: values.title,
        description: values.description,
        type: values.type,
        updatedAt: changedAt,
      })
      .where(eq(ticket.id, ticketId))

    if (changes.tag) {
      if (currentTagRow) {
        await tx
          .update(ticketTag)
          .set({ tagId: values.tagId, createdAt: changedAt })
          .where(eq(ticketTag.ticketId, ticketId))
      } else {
        await tx.insert(ticketTag).values({
          ticketId,
          tagId: values.tagId,
          createdAt: changedAt,
        })
      }
    }

    await tx.insert(ticketHistory).values({
      ticketId,
      changedBy: authorId,
      event: "edicao",
      note: describeTicketEditNote(changes),
      changedAt,
    })

    if (changes.tag) {
      await tx.insert(ticketHistory).values({
        ticketId,
        changedBy: authorId,
        event: "mudanca_tag",
        fromTagId: changes.tag.fromTagId,
        toTagId: changes.tag.toTagId,
        changedAt,
      })
    }

    return { status: "saved", ticketId, tagChanged: changes.tag !== null }
  })
}
