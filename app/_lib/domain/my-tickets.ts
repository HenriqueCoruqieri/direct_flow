import { ALL_TIME_PERIOD_PRESETS } from "@/app/_lib/domain/period"
import { NON_FINAL_TICKET_STATUSES } from "@/app/_lib/domain/ticket"
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
    statuses: NON_FINAL_TICKET_STATUSES,
    emptyTitle: "Nenhum chamado em andamento",
    emptyDescription:
      "Os chamados que você abrir aparecem aqui até serem fechados ou cancelados.",
  },
  assigned: {
    label: "Atribuídos a mim",
    relation: "assignee",
    statuses: NON_FINAL_TICKET_STATUSES,
    emptyTitle: "Nenhum chamado atribuído a você",
    emptyDescription:
      "Os chamados pelos quais você for responsável aparecem aqui até serem fechados ou cancelados.",
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
