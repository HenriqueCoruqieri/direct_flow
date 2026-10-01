import {
  formatTicketNumber,
  TICKET_PRIORITY_LABELS,
} from "@/app/_lib/domain/ticket"
import type { TicketPriority, TicketStatus } from "@/app/_lib/types/ticket"
import { cn } from "@/app/_lib/utils"

import TicketStatusBadge from "../../../_components/ticket-status-badge"

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
}

const TicketDetailHeader = ({
  id,
  title,
  status,
  priority,
}: TicketDetailHeaderProps) => {
  return (
    <header className="flex flex-col gap-2">
      <span className="text-caption font-bold text-muted-foreground tabular-nums">
        {formatTicketNumber(id)}
      </span>
      <h1 className="font-heading text-title font-semibold wrap-break-word">
        {title}
      </h1>
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
