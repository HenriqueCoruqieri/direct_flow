import {
  buildTicketCommentFormDefaults,
  NO_COMMENTS_LABEL,
} from "@/app/_lib/domain/ticket-comments"
import type { TicketCommentFormState } from "@/app/_lib/types/ticket-comments"
import { cn } from "@/app/_lib/utils"

import CommentsScrollArea from "./comments-scroll-area"
import TicketCommentForm from "./ticket-comment-form"
import TicketCommentItem, {
  type TicketCommentEntry,
} from "./ticket-comment-item"

interface TicketCommentsProps {
  ticketId: number
  entries: TicketCommentEntry[]
  form: TicketCommentFormState
  className?: string
}

const TicketComments = ({
  ticketId,
  entries,
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
          {entries.length}
        </span>
      </h2>

      <div className="relative lg:min-h-40 lg:flex-1">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{NO_COMMENTS_LABEL}</p>
        ) : (
          <CommentsScrollArea
            itemCount={entries.length}
            label="Lista de comentários"
            className="max-h-96 lg:absolute lg:inset-0 lg:max-h-none"
          >
            <ol className="flex flex-col gap-2.5">
              {entries.map((entry) => (
                <TicketCommentItem
                  key={entry.message.id}
                  ticketId={ticketId}
                  entry={entry}
                />
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
