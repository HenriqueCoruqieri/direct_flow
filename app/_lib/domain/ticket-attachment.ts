import { canUploadAttachment } from "@/app/_lib/domain/attachment"
import { canEditTicket } from "@/app/_lib/domain/ticket-edit"
import type {
  TicketEditabilityFacts,
  TicketEditDetailFacts,
  TicketEditorFacts,
} from "@/app/_lib/types/ticket-edit"

export const ATTACHMENT_ASSIGNEE_ONLY_MESSAGE =
  "Só o destinatário do chamado pode incluir anexos."

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
