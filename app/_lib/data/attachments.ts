import { and, asc, eq, isNull } from "drizzle-orm"

import type {
  AttachmentDownloadTarget,
  TicketAttachmentItem,
} from "@/app/_lib/types/attachment"
import { db } from "@/db"
import { attachment, ticket, user } from "@/db/schema"

export async function listTicketAttachments(
  ticketId: number,
): Promise<TicketAttachmentItem[]> {
  return db
    .select({
      id: attachment.id,
      fileName: attachment.fileName,
      sizeBytes: attachment.sizeBytes,
      uploadedByName: user.name,
      createdAt: attachment.createdAt,
    })
    .from(attachment)
    .innerJoin(user, eq(user.id, attachment.uploadedBy))
    .where(and(eq(attachment.ticketId, ticketId), isNull(attachment.messageId)))
    .orderBy(asc(attachment.createdAt), asc(attachment.id))
}

export async function findAttachmentForDownload(
  attachmentId: number,
): Promise<AttachmentDownloadTarget | null> {
  const [row] = await db
    .select({
      id: attachment.id,
      fileName: attachment.fileName,
      storageKey: attachment.storageKey,
      createdBy: ticket.createdBy,
      assignedTo: ticket.assignedTo,
      currentDepartmentId: ticket.currentDepartmentId,
    })
    .from(attachment)
    .innerJoin(ticket, eq(ticket.id, attachment.ticketId))
    .where(and(eq(attachment.id, attachmentId), isNull(attachment.messageId)))
    .limit(1)

  if (!row) return null

  return {
    id: row.id,
    fileName: row.fileName,
    storageKey: row.storageKey,
    ticket: {
      createdBy: row.createdBy,
      assignedTo: row.assignedTo,
      currentDepartmentId: row.currentDepartmentId,
    },
  }
}
