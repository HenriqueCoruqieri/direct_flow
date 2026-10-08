import { canViewTicket } from "@/app/_lib/domain/ticket"
import { isTicketLocked } from "@/app/_lib/domain/ticket-closure"
import type {
  TicketActorFacts,
  TicketViewerFacts,
  TicketVisibilityFacts,
} from "@/app/_lib/types/ticket"
import type {
  DeleteTicketCommentTarget,
  EditTicketCommentFormDefaults,
  MessageVisibility,
  TicketCommentBlockReason,
  TicketCommentDeleteBlockReason,
  TicketCommentEditBlockReason,
  TicketCommentFacts,
  TicketCommentFormDefaults,
  TicketCommentFormState,
  TicketMessageAuthorFacts,
  TicketMessageItem,
  TicketMessageScope,
  TicketMessageTimestamps,
  TicketMessageVisibilityFacts,
} from "@/app/_lib/types/ticket-comments"

export const TICKET_COMMENT_MIN_LENGTH = 1

export const TICKET_COMMENT_MAX_LENGTH = 5000

export const PRIVATE_COMMENT_LABEL = "Comentário privado"

export const PRIVATE_COMMENT_BADGE = "Privado"

export const NO_COMMENTS_LABEL = "Nenhum comentário ainda."

export const TICKET_COMMENTS_CLOSED_MESSAGE =
  "Este chamado foi encerrado e não recebe novos comentários."

export const TICKET_COMMENT_ADDED_MESSAGE = "Comentário publicado."

export const EDIT_COMMENT_LABEL = "Editar"

export const SAVE_COMMENT_LABEL = "Salvar"

export const SAVE_COMMENT_PENDING_LABEL = "Salvando…"

export const EDITED_COMMENT_LABEL = "(editado)"

export const TICKET_COMMENT_EDITED_MESSAGE = "Comentário atualizado."

export const ticketCommentBlockFor = (
  commenter: TicketActorFacts,
  ticket: TicketCommentFacts,
  now: Date,
): TicketCommentBlockReason | null => {
  if (!commenter.isActive) return "COMMENTER_INACTIVE"
  if (commenter.mustChangePassword) return "PASSWORD_CHANGE_REQUIRED"
  if (!canViewTicket(commenter, ticket)) return "CANNOT_VIEW"
  if (isTicketLocked(ticket.status, ticket.resolvedAt, now)) {
    return "TICKET_FINISHED"
  }
  return null
}

export const canCommentOnTicket = (
  commenter: TicketActorFacts,
  ticket: TicketCommentFacts,
  now: Date,
): boolean => ticketCommentBlockFor(commenter, ticket, now) === null

export const ticketCommentFormStateFor = (
  commenter: TicketActorFacts,
  ticket: TicketCommentFacts,
  now: Date,
): TicketCommentFormState => {
  const reason = ticketCommentBlockFor(commenter, ticket, now)
  if (reason === null) return { state: "open" }
  if (reason === "TICKET_FINISHED") {
    return { state: "closed", message: TICKET_COMMENTS_CLOSED_MESSAGE }
  }
  return { state: "hidden" }
}

export const canSeeInternalComments = (
  viewer: TicketViewerFacts,
  ticket: Pick<TicketVisibilityFacts, "currentDepartmentId">,
): boolean =>
  viewer.isBoard || viewer.departmentId === ticket.currentDepartmentId

export const ticketMessageScopeFor = (
  viewer: TicketViewerFacts,
  ticket: Pick<TicketVisibilityFacts, "currentDepartmentId">,
): TicketMessageScope => ({
  viewerId: viewer.userId,
  includeInternal: canSeeInternalComments(viewer, ticket),
})

export const messageVisibilityFor = (isPrivate: boolean): MessageVisibility =>
  isPrivate ? "interna" : "publica"

export const isPrivateMessage = (visibility: MessageVisibility): boolean =>
  visibility === "interna"

export const buildTicketCommentFormDefaults = (
  ticketId: number,
): TicketCommentFormDefaults => ({ ticketId, content: "", isPrivate: false })

export const canSeeTicketMessage = (
  viewer: TicketViewerFacts,
  ticket: Pick<TicketVisibilityFacts, "currentDepartmentId">,
  message: TicketMessageVisibilityFacts,
): boolean =>
  !isPrivateMessage(message.visibility) ||
  canSeeInternalComments(viewer, ticket) ||
  message.authorId === viewer.userId

export const ticketCommentEditBlockFor = (
  editor: TicketActorFacts,
  ticket: TicketCommentFacts,
  message: TicketMessageAuthorFacts,
  now: Date,
): TicketCommentEditBlockReason | null => {
  const reason = ticketCommentBlockFor(editor, ticket, now)
  if (reason !== null) return reason
  if (message.authorId !== editor.userId) return "NOT_COMMENT_AUTHOR"
  return null
}

export const canEditTicketComment = (
  editor: TicketActorFacts,
  ticket: TicketCommentFacts,
  message: TicketMessageAuthorFacts,
  now: Date,
): boolean => ticketCommentEditBlockFor(editor, ticket, message, now) === null

export const DELETE_COMMENT_LABEL = "Excluir"

export const DELETE_COMMENT_PENDING_LABEL = "Excluindo…"

export const DELETE_COMMENT_DIALOG_TITLE = "Excluir comentário?"

export const DELETE_COMMENT_DIALOG_DESCRIPTION =
  "O comentário será removido do chamado para todos que o veem. Esta ação não pode ser desfeita."

export const TICKET_COMMENT_DELETED_MESSAGE = "Comentário excluído."

export const TICKET_COMMENT_GONE_MESSAGE =
  "Este comentário não existe mais. Confira a lista atualizada."

export const ticketCommentDeleteBlockFor = (
  actor: TicketActorFacts,
  ticket: TicketCommentFacts,
  message: TicketMessageAuthorFacts,
  now: Date,
): TicketCommentDeleteBlockReason | null =>
  ticketCommentEditBlockFor(actor, ticket, message, now)

export const canDeleteTicketComment = (
  actor: TicketActorFacts,
  ticket: TicketCommentFacts,
  message: TicketMessageAuthorFacts,
  now: Date,
): boolean => ticketCommentDeleteBlockFor(actor, ticket, message, now) === null

export const buildDeleteTicketCommentTarget = (
  ticketId: number,
  message: Pick<TicketMessageItem, "id">,
): DeleteTicketCommentTarget => ({ ticketId, messageId: message.id })

export const isTicketMessageEdited = (
  message: TicketMessageTimestamps,
): boolean => message.updatedAt.getTime() !== message.createdAt.getTime()

export const buildEditTicketCommentFormDefaults = (
  ticketId: number,
  message: Pick<TicketMessageItem, "id" | "content">,
): EditTicketCommentFormDefaults => ({
  ticketId,
  messageId: message.id,
  content: message.content,
})
