import { ALL_TIME_PERIOD_PRESETS } from "@/app/_lib/domain/period"
import {
  ACTIVE_TICKET_STATUSES,
  RESOLVED_TICKET_STATUS,
} from "@/app/_lib/domain/ticket"
import { RESOLUTION_EDIT_WINDOW_DAYS } from "@/app/_lib/domain/ticket-closure"
import type {
  MyTicketsEmptyCopy,
  MyTicketsTab,
  MyTicketsTabRule,
} from "@/app/_lib/types/my-tickets"
import type { PeriodFilterSelection } from "@/app/_lib/types/period"

export const MY_TICKETS_PATH = "/tickets"

export const MY_TICKETS_LABEL = "Meus chamados"

export { MY_TICKETS_TABS } from "@/app/_lib/domain/my-tickets-tabs"

export const DEFAULT_MY_TICKETS_TAB: MyTicketsTab = "opened"

export const MY_TICKETS_PERIOD_PRESETS = ALL_TIME_PERIOD_PRESETS

export const DEFAULT_MY_TICKETS_PERIOD: PeriodFilterSelection = {
  periodo: "hoje",
}

export const MY_TICKETS_EMPTY_PERIOD: MyTicketsEmptyCopy = {
  title: "Nenhum chamado neste período",
  description:
    "Nenhum chamado desta aba foi aberto no período escolhido. Escolha outro período ou “Todos”.",
}

export const MY_TICKETS_TAB_RULES = {
  opened: {
    label: "Abertos por mim",
    relation: "author",
    statuses: ACTIVE_TICKET_STATUSES,
    emptyTitle: "Nenhum chamado em andamento",
    emptyDescription:
      "Os chamados que você abrir aparecem aqui até serem resolvidos ou cancelados.",
  },
  assigned: {
    label: "Atribuídos a mim",
    relation: "assignee",
    statuses: ACTIVE_TICKET_STATUSES,
    emptyTitle: "Nenhum chamado atribuído a você",
    emptyDescription:
      "Os chamados pelos quais você for responsável aparecem aqui até serem resolvidos ou cancelados.",
  },
  resolved: {
    label: "Resolvidos",
    relation: "author",
    statuses: [RESOLVED_TICKET_STATUS],
    emptyTitle: "Nenhum chamado resolvido",
    emptyDescription: `Os chamados que você abriu e foram resolvidos aparecem aqui até o fechamento automático, ${RESOLUTION_EDIT_WINDOW_DAYS} dias após a resolução.`,
  },
  closed: {
    label: "Fechados",
    relation: "author",
    statuses: ["fechado"],
    emptyTitle: "Nenhum chamado fechado",
    emptyDescription:
      "Os chamados que você abriu e foram fechados aparecem aqui.",
  },
  cancelled: {
    label: "Cancelados",
    relation: "author",
    statuses: ["cancelado"],
    emptyTitle: "Nenhum chamado cancelado",
    emptyDescription:
      "Os chamados que você abriu e foram cancelados aparecem aqui.",
  },
} satisfies Record<MyTicketsTab, MyTicketsTabRule>

export const myTicketsEmptyCopy = (
  tab: MyTicketsTab,
  period: PeriodFilterSelection,
): MyTicketsEmptyCopy => {
  if (period.periodo !== "todos") return MY_TICKETS_EMPTY_PERIOD
  const { emptyTitle, emptyDescription } = MY_TICKETS_TAB_RULES[tab]
  return { title: emptyTitle, description: emptyDescription }
}
