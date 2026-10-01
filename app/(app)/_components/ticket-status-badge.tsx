import { Badge } from "@/app/_components/ui/badge"
import { TICKET_STATUS_LABELS } from "@/app/_lib/domain/ticket"
import type { TicketStatus } from "@/app/_lib/types/ticket"

const STATUS_CLASSES = {
  aberto: "border-status-aberto/30 bg-status-aberto/10 text-status-aberto",
  em_analise:
    "border-status-em-analise/30 bg-status-em-analise/10 text-status-em-analise",
  encaminhado:
    "border-status-encaminhado/30 bg-status-encaminhado/10 text-status-encaminhado",
  aguardando_aprovacao:
    "border-status-aguardando-aprovacao/30 bg-status-aguardando-aprovacao/10 text-status-aguardando-aprovacao",
  em_andamento:
    "border-status-em-andamento/30 bg-status-em-andamento/10 text-status-em-andamento",
  resolvido:
    "border-status-resolvido/30 bg-status-resolvido/10 text-status-resolvido",
  fechado: "border-status-fechado/30 bg-status-fechado/10 text-status-fechado",
  cancelado:
    "border-status-cancelado/30 bg-status-cancelado/10 text-status-cancelado",
} satisfies Record<TicketStatus, string>

interface TicketStatusBadgeProps {
  status: TicketStatus
}

const TicketStatusBadge = ({ status }: TicketStatusBadgeProps) => (
  <Badge variant="outline" className={STATUS_CLASSES[status]}>
    {TICKET_STATUS_LABELS[status]}
  </Badge>
)

export default TicketStatusBadge
