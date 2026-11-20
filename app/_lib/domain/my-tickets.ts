import { navBadgeFor } from "@/app/_lib/domain/nav-badge"
import { ALL_TIME_PERIOD_PRESETS } from "@/app/_lib/domain/period"
import {
  ACTIVE_TICKET_STATUSES,
  AWAITING_APPROVAL_TICKET_STATUS,
  DECLINED_TICKET_STATUS,
  isNotAwaitingApproval,
  RESOLVED_TICKET_STATUS,
} from "@/app/_lib/domain/ticket"
import { RESOLUTION_EDIT_WINDOW_DAYS } from "@/app/_lib/domain/ticket-closure"
import {
  APPROVED_TRANSFER_STATUS,
  PENDING_TRANSFER_STATUS,
  REJECTED_TRANSFER_STATUS,
} from "@/app/_lib/domain/ticket-transfer"
import type {
  MyTicketsEmptyCopy,
  MyTicketsLastTransferMatch,
  MyTicketsTab,
  MyTicketsTabRule,
} from "@/app/_lib/types/my-tickets"
import type { NavBadge } from "@/app/_lib/types/nav-badge"
import type { PeriodFilterSelection } from "@/app/_lib/types/period"
import type { TicketStatus } from "@/app/_lib/types/ticket"

export const MY_TICKETS_PATH = "/tickets"

export const MY_TICKETS_LABEL = "Meus chamados"

export { MY_TICKETS_TABS } from "@/app/_lib/domain/my-tickets-tabs"

export const DEFAULT_MY_TICKETS_TAB: MyTicketsTab = "assigned"

export const MY_TICKETS_PERIOD_PRESETS = ALL_TIME_PERIOD_PRESETS

export const DEFAULT_MY_TICKETS_PERIOD: PeriodFilterSelection = {
  periodo: "todos",
}

export const MY_TICKETS_EMPTY_PERIOD: MyTicketsEmptyCopy = {
  title: "Nenhum chamado neste período",
  description:
    "Nenhum chamado desta aba foi aberto no período escolhido. Escolha outro período ou “Todos”.",
}

const SENT_PENDING_MATCH = {
  transferStatus: PENDING_TRANSFER_STATUS,
  ticketStatuses: [AWAITING_APPROVAL_TICKET_STATUS],
  assigneeIsReviewer: false,
} satisfies MyTicketsLastTransferMatch

const SENT_DECLINED_MATCH = {
  transferStatus: REJECTED_TRANSFER_STATUS,
  ticketStatuses: [DECLINED_TICKET_STATUS],
  assigneeIsReviewer: false,
} satisfies MyTicketsLastTransferMatch

const SENT_TAB_MATCHES = [
  SENT_PENDING_MATCH,
  SENT_DECLINED_MATCH,
] satisfies readonly MyTicketsLastTransferMatch[]

const isAttendedTabStatus = (status: TicketStatus): boolean =>
  isNotAwaitingApproval(status) && status !== DECLINED_TICKET_STATUS

const ATTENDED_TAB_MATCHES = [
  {
    transferStatus: APPROVED_TRANSFER_STATUS,
    ticketStatuses: ACTIVE_TICKET_STATUSES.filter(isAttendedTabStatus),
    assigneeIsReviewer: true,
  },
] satisfies readonly MyTicketsLastTransferMatch[]

const lastTransferStatuses = (
  matches: readonly MyTicketsLastTransferMatch[],
): readonly TicketStatus[] => matches.flatMap((match) => match.ticketStatuses)

export const MY_TICKETS_TAB_RULES = {
  sent: {
    label: "Enviados e recusados",
    relation: "lastTransferRequester",
    lastTransfer: SENT_TAB_MATCHES,
    statuses: lastTransferStatuses(SENT_TAB_MATCHES),
    emptyTitle: "Nenhum chamado enviado ou recusado",
    emptyDescription:
      "Os chamados que você enviar para outro setor aparecem aqui enquanto aguardam o aceite do destino e, se forem recusados, até você dar um novo encaminhamento.",
  },
  attended: {
    label: "Atendidos",
    relation: "lastTransferRequester",
    lastTransfer: ATTENDED_TAB_MATCHES,
    statuses: lastTransferStatuses(ATTENDED_TAB_MATCHES),
    emptyTitle: "Nenhum chamado atendido",
    emptyDescription:
      "Os chamados que você enviou e foram aceitos pelo destino aparecem aqui enquanto continuam com quem os aceitou, até serem resolvidos ou cancelados.",
  },
  assigned: {
    label: "Atribuídos a mim",
    relation: "assignee",
    statuses: ACTIVE_TICKET_STATUSES,
    departmentScope: "any",
    emptyTitle: "Nenhum chamado atribuído a você",
    emptyDescription:
      "Os chamados pelos quais você for responsável aparecem aqui até serem resolvidos ou cancelados.",
  },
  resolved: {
    label: "Resolvidos",
    relation: "author",
    statuses: [RESOLVED_TICKET_STATUS],
    departmentScope: "origin",
    emptyTitle: "Nenhum chamado resolvido",
    emptyDescription: `Os chamados que você abriu e foram resolvidos aparecem aqui até o fechamento automático, ${RESOLUTION_EDIT_WINDOW_DAYS} dias após a resolução.`,
  },
  closed: {
    label: "Fechados",
    relation: "author",
    statuses: ["fechado"],
    departmentScope: "origin",
    emptyTitle: "Nenhum chamado fechado",
    emptyDescription:
      "Os chamados que você abriu e foram fechados aparecem aqui.",
  },
  cancelled: {
    label: "Cancelados",
    relation: "author",
    statuses: ["cancelado"],
    departmentScope: "origin",
    emptyTitle: "Nenhum chamado cancelado",
    emptyDescription:
      "Os chamados que você abriu e foram cancelados aparecem aqui.",
  },
} satisfies Record<MyTicketsTab, MyTicketsTabRule>

export const mapMyTicketsTabs = <T>(
  map: (tab: MyTicketsTab) => T,
): Record<MyTicketsTab, T> => ({
  assigned: map("assigned"),
  sent: map("sent"),
  attended: map("attended"),
  resolved: map("resolved"),
  closed: map("closed"),
  cancelled: map("cancelled"),
})

export const myTicketsEmptyCopy = (
  tab: MyTicketsTab,
  period: PeriodFilterSelection,
): MyTicketsEmptyCopy => {
  if (period.periodo !== "todos") return MY_TICKETS_EMPTY_PERIOD
  const { emptyTitle, emptyDescription } = MY_TICKETS_TAB_RULES[tab]
  return { title: emptyTitle, description: emptyDescription }
}

export const MY_TICKETS_NAV_BADGE_MATCH: MyTicketsLastTransferMatch =
  SENT_DECLINED_MATCH

export const myTicketsNavBadgeFor = (count: number): NavBadge | null =>
  navBadgeFor(
    count,
    `${MY_TICKETS_LABEL}, ${count} ${count === 1 ? "recusado" : "recusados"}`,
    "destructive",
  )
