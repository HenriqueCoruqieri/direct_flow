import { TICKET_PRIORITY_LABELS } from "@/app/_lib/domain/ticket"
import type { TicketPriority } from "@/app/_lib/types/ticket"
import { cn } from "@/app/_lib/utils"

const PRIORITY_TEXT_CLASSES = {
  baixa: "text-prioridade-baixa",
  media: "text-prioridade-media",
  alta: "text-prioridade-alta",
  critica: "text-prioridade-critica",
} satisfies Record<TicketPriority, string>

interface TicketPriorityTextProps {
  priority: TicketPriority
  className?: string
}

const TicketPriorityText = ({
  priority,
  className,
}: TicketPriorityTextProps) => (
  <span
    className={cn(
      "font-semibold whitespace-nowrap",
      PRIORITY_TEXT_CLASSES[priority],
      className,
    )}
  >
    {TICKET_PRIORITY_LABELS[priority]}
  </span>
)

export default TicketPriorityText
