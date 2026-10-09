import { and, asc, eq, inArray, isNull, lte, or } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

import { lockActorFacts } from "@/app/_lib/data/actor-facts"
import {
  canViewTicket,
  CLOSED_TICKET_STATUS,
  INITIAL_TICKET_PRIORITY,
  isUsableTicketTag,
  RESOLVED_TICKET_STATUS,
} from "@/app/_lib/domain/ticket"
import { isUsableTicketAssignee } from "@/app/_lib/domain/ticket-assignee"
import {
  assigneeTargetFor,
  ATTENDED_TICKET_STATUS,
  creationStatusFor,
  isTicketAttendConflict,
  statusAfterReassignment,
  ticketAssumeBlockFor,
  ticketAttendBlockFor,
  ticketSendBlockFor,
} from "@/app/_lib/domain/ticket-assignment"
import { AUTO_CLOSE_NOTE } from "@/app/_lib/domain/ticket-closure"
import {
  canEditSolution,
  canEditTicket,
  describeTicketEditNote,
  diffTicketEdit,
  hasTicketEditChanges,
} from "@/app/_lib/domain/ticket-edit"
import { canResolveTicket } from "@/app/_lib/domain/ticket-resolution"
import {
  canViewTicketAfterTransfer,
  isTicketDepartmentSendConflict,
  isUsableTransferTarget,
  ticketDepartmentSendBlockFor,
  TRANSFER_REQUESTED_TICKET_STATUS,
} from "@/app/_lib/domain/ticket-transfer"
import type {
  InsertTicketOutcome,
  InsertTicketValues,
  TicketDetail,
} from "@/app/_lib/types/ticket"
import type {
  AssignTicketOutcome,
  AssignTicketValues,
  StartTicketWorkOutcome,
  StartTicketWorkValues,
  TicketAssignmentFacts,
} from "@/app/_lib/types/ticket-assignment"
import type { CloseExpiredResolvedTicketsOutcome } from "@/app/_lib/types/ticket-closure"
import type {
  UpdateTicketByAuthorOutcome,
  UpdateTicketByAuthorValues,
} from "@/app/_lib/types/ticket-edit"
import type {
  UpdateTicketResolutionOutcome,
  UpdateTicketResolutionValues,
} from "@/app/_lib/types/ticket-resolution"
import type {
  RequestTicketTransferOutcome,
  RequestTicketTransferValues,
} from "@/app/_lib/types/ticket-transfer"
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
  const changerDepartment = alias(department, "history_changer_department")
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
        solution: ticket.solution,
        resolvedAt: ticket.resolvedAt,
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
        changedById: ticketHistory.changedBy,
        changedByName: changer.name,
        changedByDepartmentName: changerDepartment.name,
        fromStatus: ticketHistory.fromStatus,
        toStatus: ticketHistory.toStatus,
        fromPriority: ticketHistory.fromPriority,
        toPriority: ticketHistory.toPriority,
        fromDepartmentName: fromDepartment.name,
        toDepartmentName: toDepartment.name,
        fromAssigneeName: fromAssignee.name,
        toAssigneeId: ticketHistory.toAssigneeId,
        toAssigneeName: toAssignee.name,
        fromTagName: fromTag.name,
        toTagName: toTag.name,
        note: ticketHistory.note,
      })
      .from(ticketHistory)
      .leftJoin(changer, eq(changer.id, ticketHistory.changedBy))
      .leftJoin(
        changerDepartment,
        eq(changerDepartment.id, changer.departmentId),
      )
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

    if (values.assigneeId !== null) {
      const [assigneeRow] = await tx
        .select({ departmentId: user.departmentId, isActive: user.isActive })
        .from(user)
        .where(eq(user.id, values.assigneeId))
        .for("share")

      if (
        !assigneeRow ||
        !isUsableTicketAssignee(assigneeRow, values.originDepartmentId)
      ) {
        return { status: "invalid_assignee" }
      }
    }

    const initialStatus = creationStatusFor(
      assigneeTargetFor(values.createdBy, values.assigneeId),
    )

    const [created] = await tx
      .insert(ticket)
      .values({
        title: values.title,
        description: values.description,
        type: values.type,
        status: initialStatus,
        priority: INITIAL_TICKET_PRIORITY,
        createdBy: values.createdBy,
        assignedTo: values.assigneeId,
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
      toStatus: initialStatus,
      toPriority: INITIAL_TICKET_PRIORITY,
      toDepartmentId: values.originDepartmentId,
      toAssigneeId: values.assigneeId,
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
        solution: ticket.solution,
        resolvedAt: ticket.resolvedAt,
      })
      .from(ticket)
      .where(eq(ticket.id, ticketId))
      .for("update")

    if (!ticketRow) return { status: "not_found" }

    const now = new Date()

    const editor = await lockActorFacts(tx, authorId)

    if (!editor) return { status: "not_editable" }

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
      !canEditTicket(
        editor,
        {
          createdBy: ticketRow.createdBy,
          currentDepartmentId: ticketRow.currentDepartmentId,
          status: ticketRow.status,
          resolvedAt: ticketRow.resolvedAt,
          hasPendingTransfer: pendingTransfer !== undefined,
        },
        now,
      )
    ) {
      return { status: "not_editable" }
    }

    if (values.solution !== undefined && !canEditSolution(ticketRow.status)) {
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

    if (values.assigneeId !== null) {
      const [chosenAssigneeRow] = await tx
        .select({ departmentId: user.departmentId, isActive: user.isActive })
        .from(user)
        .where(eq(user.id, values.assigneeId))
        .for("share")

      if (
        !chosenAssigneeRow ||
        !isUsableTicketAssignee(chosenAssigneeRow, editor.departmentId)
      ) {
        return { status: "invalid_assignee" }
      }
    }

    const changes = diffTicketEdit(
      {
        title: ticketRow.title,
        description: ticketRow.description,
        type: ticketRow.type,
        tagId: currentTagRow?.tagId ?? null,
        assignedTo: ticketRow.assignedTo,
        solution: ticketRow.solution,
      },
      values,
    )

    if (!hasTicketEditChanges(changes)) return { status: "no_changes" }

    const changedAt = now

    const nextStatus = changes.assignee
      ? statusAfterReassignment(
          ticketRow.status,
          assigneeTargetFor(authorId, values.assigneeId),
        )
      : ticketRow.status

    await tx
      .update(ticket)
      .set({
        title: values.title,
        description: values.description,
        type: values.type,
        ...(changes.solution ? { solution: values.solution } : {}),
        ...(changes.assignee ? { assignedTo: values.assigneeId } : {}),
        ...(nextStatus !== ticketRow.status ? { status: nextStatus } : {}),
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

    if (changes.assignee) {
      await tx.insert(ticketHistory).values({
        ticketId,
        changedBy: authorId,
        event: "atribuicao",
        fromAssigneeId: changes.assignee.fromAssigneeId,
        toAssigneeId: changes.assignee.toAssigneeId,
        ...(changes.assignee.toAssigneeId === null
          ? { toDepartmentId: ticketRow.currentDepartmentId }
          : {}),
        changedAt,
      })
    }

    if (nextStatus !== ticketRow.status) {
      await tx.insert(ticketHistory).values({
        ticketId,
        changedBy: authorId,
        event: "mudanca_status",
        fromStatus: ticketRow.status,
        toStatus: nextStatus,
        changedAt,
      })
    }

    return { status: "saved", ticketId, tagChanged: changes.tag !== null }
  })
}

export async function updateTicketResolution(
  values: UpdateTicketResolutionValues,
): Promise<UpdateTicketResolutionOutcome> {
  const { ticketId, solution, resolverId } = values

  return db.transaction(async (tx) => {
    const [ticketRow] = await tx
      .select({
        createdBy: ticket.createdBy,
        assignedTo: ticket.assignedTo,
        currentDepartmentId: ticket.currentDepartmentId,
        status: ticket.status,
      })
      .from(ticket)
      .where(eq(ticket.id, ticketId))
      .for("update")

    if (!ticketRow) return { status: "not_found" }

    const resolver = await lockActorFacts(tx, resolverId)

    if (!resolver) return { status: "not_resolvable" }

    if (!canViewTicket(resolver, ticketRow)) return { status: "not_found" }

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
      !canResolveTicket(resolver, {
        ...ticketRow,
        hasPendingTransfer: pendingTransfer !== undefined,
      })
    ) {
      return { status: "not_resolvable" }
    }

    const changedAt = new Date()

    await tx
      .update(ticket)
      .set({
        status: RESOLVED_TICKET_STATUS,
        solution,
        resolvedAt: changedAt,
        updatedAt: changedAt,
      })
      .where(eq(ticket.id, ticketId))

    await tx.insert(ticketHistory).values({
      ticketId,
      changedBy: resolverId,
      event: "resolucao",
      fromStatus: ticketRow.status,
      toStatus: RESOLVED_TICKET_STATUS,
      changedAt,
    })

    return { status: "saved", ticketId }
  })
}

export async function assignTicket(
  values: AssignTicketValues,
): Promise<AssignTicketOutcome> {
  const { ticketId, actorId } = values

  return db.transaction(async (tx) => {
    const [ticketRow] = await tx
      .select({
        createdBy: ticket.createdBy,
        assignedTo: ticket.assignedTo,
        currentDepartmentId: ticket.currentDepartmentId,
        status: ticket.status,
      })
      .from(ticket)
      .where(eq(ticket.id, ticketId))
      .for("update")

    if (!ticketRow) return { status: "not_found" }

    const actor = await lockActorFacts(tx, actorId)

    if (!actor) return { status: "not_assignable" }

    if (!canViewTicket(actor, ticketRow)) return { status: "not_found" }

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

    if (ticketRow.assignedTo !== values.expectedAssigneeId) {
      if (ticketRow.assignedTo === null) {
        return {
          status: "conflict",
          currentAssigneeId: null,
          currentAssigneeName: null,
        }
      }

      const [currentAssigneeRow] = await tx
        .select({ name: user.name })
        .from(user)
        .where(eq(user.id, ticketRow.assignedTo))

      return {
        status: "conflict",
        currentAssigneeId: ticketRow.assignedTo,
        currentAssigneeName: currentAssigneeRow?.name ?? null,
      }
    }

    const facts: TicketAssignmentFacts = {
      ...ticketRow,
      hasPendingTransfer: pendingTransfer !== undefined,
    }

    const blockReason =
      values.mode === "assume"
        ? ticketAssumeBlockFor(actor, facts)
        : ticketSendBlockFor(actor, facts)

    if (blockReason !== null) return { status: "not_assignable" }

    let newAssigneeId = actorId
    let newAssigneeName = actor.name

    if (values.mode === "send") {
      const [assigneeRow] = await tx
        .select({
          departmentId: user.departmentId,
          isActive: user.isActive,
          name: user.name,
        })
        .from(user)
        .where(eq(user.id, values.assigneeId))
        .for("share")

      if (
        !assigneeRow ||
        !isUsableTicketAssignee(assigneeRow, ticketRow.currentDepartmentId) ||
        values.assigneeId === ticketRow.assignedTo
      ) {
        return { status: "invalid_assignee" }
      }

      newAssigneeId = values.assigneeId
      newAssigneeName = assigneeRow.name
    }

    const changedAt = new Date()

    const nextStatus = statusAfterReassignment(
      ticketRow.status,
      assigneeTargetFor(actorId, newAssigneeId),
    )

    await tx
      .update(ticket)
      .set({
        assignedTo: newAssigneeId,
        ...(nextStatus !== ticketRow.status ? { status: nextStatus } : {}),
        updatedAt: changedAt,
      })
      .where(eq(ticket.id, ticketId))

    await tx.insert(ticketHistory).values({
      ticketId,
      changedBy: actorId,
      event: "atribuicao",
      fromAssigneeId: ticketRow.assignedTo,
      toAssigneeId: newAssigneeId,
      changedAt,
    })

    if (nextStatus !== ticketRow.status) {
      await tx.insert(ticketHistory).values({
        ticketId,
        changedBy: actorId,
        event: "mudanca_status",
        fromStatus: ticketRow.status,
        toStatus: nextStatus,
        changedAt,
      })
    }

    return { status: "saved", ticketId, assigneeName: newAssigneeName }
  })
}

export async function startTicketWork(
  values: StartTicketWorkValues,
): Promise<StartTicketWorkOutcome> {
  const { ticketId, actorId } = values

  return db.transaction(async (tx) => {
    const [ticketRow] = await tx
      .select({
        createdBy: ticket.createdBy,
        assignedTo: ticket.assignedTo,
        currentDepartmentId: ticket.currentDepartmentId,
        status: ticket.status,
      })
      .from(ticket)
      .where(eq(ticket.id, ticketId))
      .for("update")

    if (!ticketRow) return { status: "not_found" }

    const actor = await lockActorFacts(tx, actorId)

    if (!actor) return { status: "not_attendable" }

    if (!canViewTicket(actor, ticketRow)) return { status: "not_found" }

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

    const hasPendingTransfer = pendingTransfer !== undefined

    const blockReason = ticketAttendBlockFor(actor, {
      ...ticketRow,
      hasPendingTransfer,
    })

    if (blockReason !== null) {
      if (!isTicketAttendConflict(blockReason)) {
        return { status: "not_attendable" }
      }

      let currentAssigneeName: string | null = null

      if (ticketRow.assignedTo !== null && ticketRow.assignedTo !== actorId) {
        const [currentAssigneeRow] = await tx
          .select({ name: user.name })
          .from(user)
          .where(eq(user.id, ticketRow.assignedTo))

        currentAssigneeName = currentAssigneeRow?.name ?? null
      }

      return {
        status: "conflict",
        currentStatus: ticketRow.status,
        currentAssigneeId: ticketRow.assignedTo,
        currentAssigneeName,
        hasPendingTransfer,
      }
    }

    const changedAt = new Date()

    await tx
      .update(ticket)
      .set({ status: ATTENDED_TICKET_STATUS, updatedAt: changedAt })
      .where(eq(ticket.id, ticketId))

    await tx.insert(ticketHistory).values({
      ticketId,
      changedBy: actorId,
      event: "mudanca_status",
      fromStatus: ticketRow.status,
      toStatus: ATTENDED_TICKET_STATUS,
      changedAt,
    })

    return { status: "saved", ticketId }
  })
}

export async function requestTicketTransfer(
  values: RequestTicketTransferValues,
): Promise<RequestTicketTransferOutcome> {
  const { ticketId, actorId, toDepartmentId, expectedDepartmentId } = values

  return db.transaction(async (tx) => {
    const [ticketRow] = await tx
      .select({
        createdBy: ticket.createdBy,
        assignedTo: ticket.assignedTo,
        currentDepartmentId: ticket.currentDepartmentId,
        status: ticket.status,
      })
      .from(ticket)
      .where(eq(ticket.id, ticketId))
      .for("update")

    if (!ticketRow) return { status: "not_found" }

    const actor = await lockActorFacts(tx, actorId)

    if (!actor) return { status: "not_transferable" }

    if (!canViewTicket(actor, ticketRow)) return { status: "not_found" }

    const [pendingTransfer] = await tx
      .select({ id: ticketTransfer.id, departmentName: department.name })
      .from(ticketTransfer)
      .innerJoin(department, eq(department.id, ticketTransfer.toDepartmentId))
      .where(
        and(
          eq(ticketTransfer.ticketId, ticketId),
          eq(ticketTransfer.status, "pendente"),
        ),
      )
      .limit(1)

    const reason = ticketDepartmentSendBlockFor(actor, {
      ...ticketRow,
      hasPendingTransfer: pendingTransfer !== undefined,
    })

    if (reason !== null && !isTicketDepartmentSendConflict(reason)) {
      return { status: "not_transferable" }
    }

    const conflictReason =
      ticketRow.currentDepartmentId !== expectedDepartmentId
        ? "DEPARTMENT_CHANGED"
        : reason

    if (conflictReason !== null) {
      const [currentDepartmentRow] = await tx
        .select({ name: department.name })
        .from(department)
        .where(eq(department.id, ticketRow.currentDepartmentId))

      return {
        status: "conflict",
        reason: conflictReason,
        currentStatus: ticketRow.status,
        currentDepartmentName: currentDepartmentRow?.name ?? "",
        pendingTransferDepartmentName: pendingTransfer?.departmentName ?? null,
      }
    }

    const [targetRow] = await tx
      .select({
        id: department.id,
        name: department.name,
        isActive: department.isActive,
        isUnassigned: department.isUnassigned,
      })
      .from(department)
      .where(eq(department.id, toDepartmentId))
      .for("share")

    if (
      !targetRow ||
      !isUsableTransferTarget(targetRow, ticketRow.currentDepartmentId)
    ) {
      return { status: "invalid_target" }
    }

    const changedAt = new Date()

    await tx
      .update(ticket)
      .set({
        currentDepartmentId: toDepartmentId,
        assignedTo: null,
        status: TRANSFER_REQUESTED_TICKET_STATUS,
        updatedAt: changedAt,
      })
      .where(eq(ticket.id, ticketId))

    await tx.insert(ticketTransfer).values({
      ticketId,
      fromDepartmentId: ticketRow.currentDepartmentId,
      toDepartmentId,
      requestedBy: actorId,
      requestReason: null,
      status: "pendente",
      createdAt: changedAt,
      updatedAt: changedAt,
    })

    await tx.insert(ticketHistory).values({
      ticketId,
      changedBy: actorId,
      event: "transferencia_solicitada",
      fromStatus: ticketRow.status,
      toStatus: TRANSFER_REQUESTED_TICKET_STATUS,
      fromDepartmentId: ticketRow.currentDepartmentId,
      toDepartmentId,
      fromAssigneeId: ticketRow.assignedTo,
      toAssigneeId: null,
      changedAt,
    })

    return {
      status: "saved",
      ticketId,
      toDepartmentName: targetRow.name,
      actorKeepsAccess: canViewTicketAfterTransfer(
        actor,
        ticketRow,
        toDepartmentId,
      ),
    }
  })
}

export async function closeExpiredResolvedTickets(
  cutoff: Date,
  now: Date,
): Promise<CloseExpiredResolvedTicketsOutcome> {
  return db.transaction(async (tx) => {
    const candidates = await tx
      .select({ id: ticket.id })
      .from(ticket)
      .where(
        and(
          eq(ticket.status, RESOLVED_TICKET_STATUS),
          or(isNull(ticket.resolvedAt), lte(ticket.resolvedAt, cutoff)),
        ),
      )
      .orderBy(asc(ticket.id))
      .for("update", { skipLocked: true })

    if (candidates.length === 0) return { closedCount: 0 }

    const ids = candidates.map((candidate) => candidate.id)

    await tx
      .update(ticket)
      .set({
        status: CLOSED_TICKET_STATUS,
        closedAt: now,
        updatedAt: now,
      })
      .where(inArray(ticket.id, ids))

    await tx.insert(ticketHistory).values(
      ids.map((ticketId) => ({
        ticketId,
        changedBy: null,
        event: "encerramento" as const,
        fromStatus: RESOLVED_TICKET_STATUS,
        toStatus: CLOSED_TICKET_STATUS,
        note: AUTO_CLOSE_NOTE,
        changedAt: now,
      })),
    )

    return { closedCount: ids.length }
  })
}
