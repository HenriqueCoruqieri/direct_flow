import { NON_FINAL_TICKET_STATUSES } from "@/app/_lib/domain/ticket"
import type {
  MyTicketsTab,
  MyTicketsTabRule,
} from "@/app/_lib/types/my-tickets"

export const MY_TICKETS_PATH = "/tickets"

export const MY_TICKETS_LABEL = "Meus chamados"

export { MY_TICKETS_TABS } from "@/app/_lib/domain/my-tickets-tabs"

export const DEFAULT_MY_TICKETS_TAB: MyTicketsTab = "opened"

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
