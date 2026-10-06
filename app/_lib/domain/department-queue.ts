import { assignableDepartments } from "@/app/_lib/domain/department"
import { MY_TICKETS_EMPTY_PERIOD } from "@/app/_lib/domain/my-tickets"
import { ALL_TIME_PERIOD_PRESETS } from "@/app/_lib/domain/period"
import {
  ACTIVE_TICKET_STATUSES,
  RESOLVED_TICKET_STATUS,
  TICKET_CREATION_BLOCK_MESSAGES,
} from "@/app/_lib/domain/ticket"
import {
  canAssumeTicket,
  canSendTicket,
} from "@/app/_lib/domain/ticket-assignment"
import { RESOLUTION_EDIT_WINDOW_DAYS } from "@/app/_lib/domain/ticket-closure"
import type { DepartmentOption } from "@/app/_lib/types/department"
import type {
  DepartmentQueueAccessFacts,
  DepartmentQueueRowActions,
  DepartmentQueueTab,
  DepartmentQueueTabRule,
} from "@/app/_lib/types/department-queue"
import type { MyTicketsEmptyCopy } from "@/app/_lib/types/my-tickets"
import type { PeriodFilterSelection } from "@/app/_lib/types/period"
import type {
  TicketActorFacts,
  TicketViewerFacts,
} from "@/app/_lib/types/ticket"
import type { TicketAssignmentFacts } from "@/app/_lib/types/ticket-assignment"

export { DEPARTMENT_QUEUE_TABS } from "@/app/_lib/domain/department-queue-tabs"

export const DEPARTMENT_QUEUE_PATH = "/queue"

export const DEPARTMENT_QUEUE_LABEL = "Fila do setor"

export const DEPARTMENT_QUEUE_DEPARTMENT_PARAM = "setor"

export const DEPARTMENT_QUEUE_DEPARTMENT_FILTER_LABEL = "Setor"

export const NO_ASSIGNEE_LABEL = "Sem destinatário"

export const DEPARTMENT_QUEUE_UNASSIGNED_MESSAGE =
  TICKET_CREATION_BLOCK_MESSAGES.DEPARTMENT_UNASSIGNED

export const DEFAULT_DEPARTMENT_QUEUE_TAB: DepartmentQueueTab = "open"

export const DEPARTMENT_QUEUE_PERIOD_PRESETS = ALL_TIME_PERIOD_PRESETS

export const DEFAULT_DEPARTMENT_QUEUE_PERIOD: PeriodFilterSelection = {
  periodo: "todos",
}

export const DEPARTMENT_QUEUE_TAB_RULES = {
  open: {
    label: "Em aberto",
    statuses: ACTIVE_TICKET_STATUSES,
    emptyTitle: "Nenhum chamado em aberto",
    emptyDescription:
      "Os chamados que estiverem no setor aparecem aqui até serem resolvidos ou cancelados.",
  },
  resolved: {
    label: "Resolvidos",
    statuses: [RESOLVED_TICKET_STATUS],
    emptyTitle: "Nenhum chamado resolvido",
    emptyDescription: `Os chamados do setor que foram resolvidos aparecem aqui até o fechamento automático, ${RESOLUTION_EDIT_WINDOW_DAYS} dias após a resolução.`,
  },
  closed: {
    label: "Fechados",
    statuses: ["fechado"],
    emptyTitle: "Nenhum chamado fechado",
    emptyDescription: "Os chamados do setor que foram fechados aparecem aqui.",
  },
  cancelled: {
    label: "Cancelados",
    statuses: ["cancelado"],
    emptyTitle: "Nenhum chamado cancelado",
    emptyDescription:
      "Os chamados do setor que foram cancelados aparecem aqui.",
  },
} satisfies Record<DepartmentQueueTab, DepartmentQueueTabRule>

export const hasDepartmentQueue = (
  facts: DepartmentQueueAccessFacts | null,
): boolean => facts !== null && !facts.isUnassigned

export const queueDepartmentOptions = (
  viewer: TicketViewerFacts,
  options: readonly DepartmentOption[],
): DepartmentOption[] => (viewer.isBoard ? assignableDepartments(options) : [])

export const queueDepartmentParamFor = (
  viewer: TicketViewerFacts,
  departmentId: number,
): number | null => (departmentId === viewer.departmentId ? null : departmentId)

export const applicableQueueDepartmentId = (
  viewer: TicketViewerFacts,
  requestedDepartmentId: number | null,
  options: readonly DepartmentOption[],
): number | null => {
  if (!viewer.isBoard || requestedDepartmentId === null) return null
  if (!options.some((option) => option.id === requestedDepartmentId)) {
    return null
  }
  return queueDepartmentParamFor(viewer, requestedDepartmentId)
}

export const queueDepartmentIdFor = (
  viewer: TicketViewerFacts,
  appliedDepartmentId: number | null,
): number => appliedDepartmentId ?? viewer.departmentId

export const departmentQueueEmptyCopy = (
  tab: DepartmentQueueTab,
  period: PeriodFilterSelection,
): MyTicketsEmptyCopy => {
  if (period.periodo !== "todos") return MY_TICKETS_EMPTY_PERIOD
  const { emptyTitle, emptyDescription } = DEPARTMENT_QUEUE_TAB_RULES[tab]
  return { title: emptyTitle, description: emptyDescription }
}

export const queueRowActionsFor = (
  viewer: TicketActorFacts,
  row: TicketAssignmentFacts,
): DepartmentQueueRowActions => ({
  assume: canAssumeTicket(viewer, row),
  send: canSendTicket(viewer, row),
})
