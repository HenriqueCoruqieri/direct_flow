import { LockIcon } from "lucide-react"

import { Badge } from "@/app/_components/ui/badge"
import { formatDateTime, toISO } from "@/app/_lib/date"
import {
  buildDeleteTicketCommentTarget,
  buildEditTicketCommentFormDefaults,
  DELETE_COMMENT_LABEL,
  EDIT_COMMENT_LABEL,
  EDITED_COMMENT_LABEL,
  isPrivateMessage,
  isTicketMessageEdited,
  PRIVATE_COMMENT_BADGE,
} from "@/app/_lib/domain/ticket-comments"
import type { TicketMessageItem } from "@/app/_lib/types/ticket-comments"

import DeleteTicketCommentButton from "./delete-ticket-comment-button"
import TicketCommentBody from "./ticket-comment-body"
import TicketCommentEditor from "./ticket-comment-editor"

export interface TicketCommentEntry {
  message: TicketMessageItem
  canEdit: boolean
  canDelete: boolean
}

interface TicketCommentItemProps {
  ticketId: number
  entry: TicketCommentEntry
  focusAfterDeleteId: string
}

const TicketCommentItem = ({
  ticketId,
  entry,
  focusAfterDeleteId,
}: TicketCommentItemProps) => {
  const { message } = entry
  const createdAtLabel = formatDateTime(message.createdAt)
  const commentLabel = `comentário de ${message.authorName} de ${createdAtLabel}`

  const content = (
    <p className="text-sm wrap-break-word whitespace-pre-wrap text-text-secondary">
      {message.content}
    </p>
  )

  const deleteAction = entry.canDelete ? (
    <DeleteTicketCommentButton
      target={buildDeleteTicketCommentTarget(ticketId, message)}
      ariaLabel={`${DELETE_COMMENT_LABEL} ${commentLabel}`}
      focusAfterLeaveId={focusAfterDeleteId}
    />
  ) : null

  return (
    <li className="flex flex-col gap-1 rounded-lg bg-surface-muted px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-sm font-bold wrap-break-word">
          {message.authorName}
        </span>
        <time
          dateTime={toISO(message.createdAt)}
          className="text-xs text-muted-foreground tabular-nums"
        >
          {createdAtLabel}
        </time>
        {isTicketMessageEdited(message) ? (
          <span className="text-xs text-muted-foreground">
            {EDITED_COMMENT_LABEL}
          </span>
        ) : null}
        {isPrivateMessage(message.visibility) ? (
          <Badge variant="outline">
            <LockIcon aria-hidden="true" data-icon="inline-start" />
            {PRIVATE_COMMENT_BADGE}
          </Badge>
        ) : null}
      </div>
      {entry.canEdit ? (
        <TicketCommentEditor
          defaults={buildEditTicketCommentFormDefaults(ticketId, message)}
          editAriaLabel={`${EDIT_COMMENT_LABEL} ${commentLabel}`}
          actions={deleteAction}
        >
          {content}
        </TicketCommentEditor>
      ) : (
        <TicketCommentBody actions={deleteAction}>{content}</TicketCommentBody>
      )}
    </li>
  )
}

export default TicketCommentItem
