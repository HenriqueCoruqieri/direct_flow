import { LockIcon } from "lucide-react"

import { Badge } from "@/app/_components/ui/badge"
import { formatDateTime, toISO } from "@/app/_lib/date"
import {
  buildTicketCommentFormDefaults,
  isPrivateMessage,
  NO_COMMENTS_LABEL,
  PRIVATE_COMMENT_BADGE,
} from "@/app/_lib/domain/ticket-comments"
import type {
  TicketCommentFormState,
  TicketMessageItem,
} from "@/app/_lib/types/ticket-comments"
import { cn } from "@/app/_lib/utils"

import CommentsScrollArea from "./comments-scroll-area"
import TicketCommentForm from "./ticket-comment-form"

interface TicketCommentsProps {
  ticketId: number
  messages: TicketMessageItem[]
  form: TicketCommentFormState
  className?: string
}

const TicketComments = ({
  ticketId,
  messages,
  form,
  className,
}: TicketCommentsProps) => {
  return (
    <section
      aria-labelledby="ticket-comments-heading"
      className={cn(
        "flex min-w-0 flex-col gap-4 rounded-xl border border-border-subtle bg-surface p-5",
        className,
      )}
    >
      <h2
        id="ticket-comments-heading"
        className="flex items-center gap-2 font-heading text-base font-semibold"
      >
        Comentários
        <span className="text-sm font-medium text-muted-foreground tabular-nums">
          {messages.length}
        </span>
      </h2>

      <div className="relative lg:min-h-40 lg:flex-1">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">{NO_COMMENTS_LABEL}</p>
        ) : (
          <CommentsScrollArea
            itemCount={messages.length}
            label="Lista de comentários"
            className="max-h-96 lg:absolute lg:inset-0 lg:max-h-none"
          >
            <ol className="flex flex-col gap-2.5">
              {messages.map((message) => (
                <li
                  key={message.id}
                  className="flex flex-col gap-1 rounded-lg bg-surface-muted px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-bold wrap-break-word">
                      {message.authorName}
                    </span>
                    <time
                      dateTime={toISO(message.createdAt)}
                      className="text-xs text-muted-foreground tabular-nums"
                    >
                      {formatDateTime(message.createdAt)}
                    </time>
                    {isPrivateMessage(message.visibility) ? (
                      <Badge variant="outline">
                        <LockIcon aria-hidden="true" data-icon="inline-start" />
                        {PRIVATE_COMMENT_BADGE}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm wrap-break-word whitespace-pre-wrap text-text-secondary">
                    {message.content}
                  </p>
                </li>
              ))}
            </ol>
          </CommentsScrollArea>
        )}
      </div>

      {form.state === "open" ? (
        <TicketCommentForm
          defaults={buildTicketCommentFormDefaults(ticketId)}
        />
      ) : form.state === "closed" ? (
        <p className="text-sm text-muted-foreground">{form.message}</p>
      ) : null}
    </section>
  )
}

export default TicketComments
