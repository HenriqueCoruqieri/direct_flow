import {
  canUploadAttachment,
  TICKET_ATTACHMENTS_MAX,
} from "@/app/_lib/domain/attachment"
import { canEditTicket } from "@/app/_lib/domain/ticket-edit"
import type {
  TicketAttachmentEdit,
  TicketAttachmentEditCounts,
} from "@/app/_lib/types/attachment"
import type {
  TicketEditabilityFacts,
  TicketEditDetailFacts,
  TicketEditorFacts,
  TicketEditRefusal,
} from "@/app/_lib/types/ticket-edit"

export const ATTACHMENT_ASSIGNEE_ONLY_MESSAGE =
  "Só o destinatário do chamado pode incluir ou remover anexos."

export const ATTACHMENT_REMOVAL_NOT_FOUND_MESSAGE =
  "Um dos anexos removidos não está mais neste chamado. Revise os anexos e salve de novo."

export const TICKET_ATTACHMENTS_EDIT_NOTICE =
  "Inclusões e remoções de anexos só valem ao salvar as alterações."

export const canAttachToTicket = (
  actor: TicketEditorFacts,
  ticket: TicketEditabilityFacts,
  now: Date,
): boolean =>
  canUploadAttachment(actor) &&
  ticket.assignedTo === actor.userId &&
  canEditTicket(actor, ticket, now)

export const canAttachToTicketDetail = (
  actor: TicketEditorFacts,
  ticket: TicketEditDetailFacts,
  now: Date,
): boolean =>
  canAttachToTicket(
    actor,
    {
      assignedTo: ticket.assignedTo,
      currentDepartmentId: ticket.currentDepartmentId,
      status: ticket.status,
      resolvedAt: ticket.resolvedAt,
      hasPendingTransfer: ticket.pendingTransfer !== null,
    },
    now,
  )

export const ticketAttachmentCountAfterEdit = (
  counts: TicketAttachmentEditCounts,
): number => counts.saved - counts.removed + counts.added

export const hasTicketAttachmentChanges = (
  counts: TicketAttachmentEditCounts,
): boolean => counts.added > 0 || counts.removed > 0

export const exceedsTicketAttachmentsLimit = (
  counts: TicketAttachmentEditCounts,
): boolean =>
  counts.added > 0 &&
  ticketAttachmentCountAfterEdit(counts) > TICKET_ATTACHMENTS_MAX

export const ticketAttachmentSlotsLeft = (
  counts: TicketAttachmentEditCounts,
): number =>
  Math.max(0, TICKET_ATTACHMENTS_MAX - ticketAttachmentCountAfterEdit(counts))

export const describeTicketAttachmentSlots = (slots: number): string => {
  if (slots <= 0) return "Nenhuma vaga restante."
  if (slots === 1) return "Resta 1 vaga."
  return `Restam ${slots} vagas.`
}

export const areTicketAttachments = (
  ids: readonly number[],
  savedIds: readonly number[],
): boolean => ids.every((id) => savedIds.includes(id))

export const ticketAttachmentEditRefusalFor = (
  actor: TicketEditorFacts,
  ticket: TicketEditabilityFacts,
  edit: TicketAttachmentEdit,
  now: Date,
): TicketEditRefusal | null => {
  const counts: TicketAttachmentEditCounts = {
    saved: edit.savedIds.length,
    removed: new Set(edit.removedIds).size,
    added: edit.addedCount,
  }

  if (!hasTicketAttachmentChanges(counts)) return null
  if (!canAttachToTicket(actor, ticket, now)) return "attachments_not_allowed"
  if (!areTicketAttachments(edit.removedIds, edit.savedIds)) {
    return "attachment_not_found"
  }
  if (exceedsTicketAttachmentsLimit(counts)) return "attachments_limit"
  return null
}
