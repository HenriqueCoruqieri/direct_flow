import type { TicketStatus } from "@/app/_lib/types/ticket"

const TICKET_STATUS_IS_OPEN = {
  aberto: true,
  em_analise: true,
  encaminhado: true,
  aguardando_aprovacao: true,
  em_andamento: true,
  resolvido: false,
  fechado: false,
  cancelado: false,
} as const satisfies Record<TicketStatus, boolean>

export type OpenTicketStatus = {
  [K in TicketStatus]: (typeof TICKET_STATUS_IS_OPEN)[K] extends true
    ? K
    : never
}[TicketStatus]

const isTicketStatus = (value: string): value is TicketStatus =>
  Object.hasOwn(TICKET_STATUS_IS_OPEN, value)

export const isOpenTicketStatus = (
  status: TicketStatus,
): status is OpenTicketStatus => TICKET_STATUS_IS_OPEN[status]

export const OPEN_TICKET_STATUSES: readonly OpenTicketStatus[] = Object.keys(
  TICKET_STATUS_IS_OPEN,
)
  .filter(isTicketStatus)
  .filter(isOpenTicketStatus)
