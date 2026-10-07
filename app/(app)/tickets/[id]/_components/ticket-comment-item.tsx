import { LockIcon } from "lucide-react"

import { Badge } from "@/app/_components/ui/badge"
import { formatDateTime, toISO } from "@/app/_lib/date"
import {
  buildEditTicketCommentFormDefaults,
  EDIT_COMMENT_LABEL,
  EDITED_COMMENT_LABEL,
  isPrivateMessage,
  isTicketMessageEdited,
  PRIVATE_COMMENT_BADGE,
} from "@/app/_lib/domain/ticket-comments"
import type { TicketMessageItem } from "@/app/_lib/types/ticket-comments"

import TicketCommentEditor from "./ticket-comment-editor"

export interface TicketCommentEntry {
  message: TicketMessageItem
  canEdit: boolean
}

interface TicketCommentItemProps {
  ticketId: number
  entry: TicketCommentEntry
}

const TicketCommentItem = ({ ticketId, entry }: TicketCommentItemProps) => {
  const { message } = entry
  const createdAtLabel = formatDateTime(message.createdAt)

  const content = (
    <p className="text-sm wrap-break-word whitespace-pre-wrap text-text-secondary">
      {message.content}
    </p>
  )

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
          editAriaLabel={`${EDIT_COMMENT_LABEL} comentário de ${message.authorName} de ${createdAtLabel}`}
        >
          {content}
        </TicketCommentEditor>
      ) : (
        content
      )}
    </li>
  )
}

export default TicketCommentItem
