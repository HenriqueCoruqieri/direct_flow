import {
  formatTicketNumber,
  TICKET_PRIORITY_LABELS,
} from "@/app/_lib/domain/ticket"
import type { TicketPriority, TicketStatus } from "@/app/_lib/types/ticket"
import { cn } from "@/app/_lib/utils"

import TicketStatusBadge from "../../../_components/ticket-status-badge"
import AttendTicketButton from "./attend-ticket-button"
import TicketEditHeading from "./ticket-edit-heading"

const PRIORITY_DOT_CLASSES = {
  baixa: "bg-prioridade-baixa",
  media: "bg-prioridade-media",
  alta: "bg-prioridade-alta",
  critica: "bg-prioridade-critica",
} satisfies Record<TicketPriority, string>

interface TicketDetailHeaderProps {
  id: number
  title: string
  status: TicketStatus
  priority: TicketPriority
  action?: React.ReactNode
  editable?: boolean
  canAttend?: boolean
}

const TicketDetailHeader = ({
  id,
  title,
  status,
  priority,
  action,
  editable = false,
  canAttend = false,
}: TicketDetailHeaderProps) => {
  const heading = (
    <h1 className="min-w-0 font-heading text-title font-semibold wrap-break-word">
      {title}
    </h1>
  )
  const attendAction = canAttend ? <AttendTicketButton ticketId={id} /> : null

  return (
    <header className="flex flex-col gap-2">
      <span className="text-caption font-bold text-muted-foreground tabular-nums">
        {formatTicketNumber(id)}
      </span>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {editable ? (
          <TicketEditHeading heading={heading} attendAction={attendAction} />
        ) : (
          <>
            {heading}
            {attendAction !== null || action !== undefined ? (
              <div className="flex shrink-0 flex-wrap gap-2">
                {attendAction}
                {action}
              </div>
            ) : null}
          </>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <TicketStatusBadge status={status} />
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
          <span
            aria-hidden="true"
            className={cn(
              "size-2 rounded-full",
              PRIORITY_DOT_CLASSES[priority],
            )}
          />
          Prioridade {TICKET_PRIORITY_LABELS[priority]}
        </span>
      </div>
    </header>
  )
}

export default TicketDetailHeader
