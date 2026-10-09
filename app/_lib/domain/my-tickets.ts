import { ALL_TIME_PERIOD_PRESETS } from "@/app/_lib/domain/period"
import {
  ACTIVE_TICKET_STATUSES,
  AWAITING_APPROVAL_TICKET_STATUS,
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

const OPENED_TAB_STATUSES = ACTIVE_TICKET_STATUSES.filter(
  (status) => status !== AWAITING_APPROVAL_TICKET_STATUS,
)

export const MY_TICKETS_TAB_RULES = {
  opened: {
    label: "Abertos por mim",
    relation: "author",
    statuses: OPENED_TAB_STATUSES,
    departmentScope: "origin",
    emptyTitle: "Nenhum chamado em andamento",
    emptyDescription:
      "Os chamados que você abrir aparecem aqui enquanto estiverem no setor em que foram abertos, até serem resolvidos ou cancelados.",
  },
  awaiting: {
    label: "Aguardando aprovação",
    relation: "author",
    statuses: [AWAITING_APPROVAL_TICKET_STATUS],
    departmentScope: "any",
    emptyTitle: "Nenhum chamado aguardando aprovação",
    emptyDescription:
      "Os chamados que você abriu e foram enviados para outro setor aparecem aqui enquanto aguardam o aceite do setor de destino.",
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
  opened: map("opened"),
  awaiting: map("awaiting"),
  assigned: map("assigned"),
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
