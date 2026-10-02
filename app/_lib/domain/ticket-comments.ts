import { canViewTicket, isNonFinalTicketStatus } from "@/app/_lib/domain/ticket"
import type {
  TicketActorFacts,
  TicketViewerFacts,
  TicketVisibilityFacts,
} from "@/app/_lib/types/ticket"
import type {
  MessageVisibility,
  TicketCommentBlockReason,
  TicketCommentFacts,
  TicketCommentFormDefaults,
  TicketCommentFormState,
  TicketMessageScope,
} from "@/app/_lib/types/ticket-comments"

export const TICKET_COMMENT_MIN_LENGTH = 1

export const TICKET_COMMENT_MAX_LENGTH = 5000

export const PRIVATE_COMMENT_LABEL = "Comentário privado"

export const PRIVATE_COMMENT_BADGE = "Privado"

export const NO_COMMENTS_LABEL = "Nenhum comentário ainda."

export const TICKET_COMMENTS_CLOSED_MESSAGE =
  "Este chamado foi encerrado e não recebe novos comentários."

export const TICKET_COMMENT_ADDED_MESSAGE = "Comentário publicado."

export const ticketCommentBlockFor = (
  commenter: TicketActorFacts,
  ticket: TicketCommentFacts,
): TicketCommentBlockReason | null => {
  if (!commenter.isActive) return "COMMENTER_INACTIVE"
  if (commenter.mustChangePassword) return "PASSWORD_CHANGE_REQUIRED"
  if (!canViewTicket(commenter, ticket)) return "CANNOT_VIEW"
  if (!isNonFinalTicketStatus(ticket.status)) return "TICKET_FINISHED"
  return null
}

export const canCommentOnTicket = (
  commenter: TicketActorFacts,
  ticket: TicketCommentFacts,
): boolean => ticketCommentBlockFor(commenter, ticket) === null

export const ticketCommentFormStateFor = (
  commenter: TicketActorFacts,
  ticket: TicketCommentFacts,
): TicketCommentFormState => {
  const reason = ticketCommentBlockFor(commenter, ticket)
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
