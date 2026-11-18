import {
  TICKET_ACTIONS_TITLE,
  ticketActionsDisplayText,
} from "@/app/_lib/domain/ticket-actions"
import type { TicketActionsCardState } from "@/app/_lib/types/ticket-actions"
import { cn } from "@/app/_lib/utils"

import TicketActionsForm from "./ticket-actions-form"
import TicketEditActions from "./ticket-edit-actions"

interface TicketActionsProps {
  state: TicketActionsCardState
  editable?: boolean
}

const TicketActions = ({ state, editable = false }: TicketActionsProps) => {
  const body =
    state.state === "editable" ? (
      <TicketActionsForm
        key={state.defaults.actions}
        defaults={state.defaults}
      />
    ) : (
      <p
        className={cn(
          "text-sm leading-relaxed wrap-break-word whitespace-pre-wrap",
          state.actions === null
            ? "text-muted-foreground"
            : "text-text-secondary",
        )}
      >
        {ticketActionsDisplayText(state.actions)}
      </p>
    )

  return (
    <section
      aria-labelledby="ticket-actions-heading"
      className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface p-5"
    >
      <h2
        id="ticket-actions-heading"
        className="font-heading text-base font-semibold"
      >
        {TICKET_ACTIONS_TITLE}
      </h2>
      {editable ? <TicketEditActions>{body}</TicketEditActions> : body}
    </section>
  )
}

export default TicketActions
