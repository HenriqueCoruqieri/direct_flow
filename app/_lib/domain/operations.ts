import {
  formatDate,
  formatMonthFirstDay,
  formatMonthName,
  formatMonthYear,
} from "@/app/_lib/date"
import {
  assignableDepartments,
  canManageDepartmentSettings,
} from "@/app/_lib/domain/department"
import { PRESET_PERIODS } from "@/app/_lib/domain/period"
import { TICKET_CREATION_BLOCK_MESSAGES } from "@/app/_lib/domain/ticket"
import type { DepartmentOption } from "@/app/_lib/types/department"
import type {
  DepartmentGoalsRecord,
  GoalTargetDepartment,
  OperationsAccessFacts,
  OperationsEmptyCopy,
  OperationsTab,
  TeamProductionEntry,
} from "@/app/_lib/types/operations"
import type { PeriodSelection } from "@/app/_lib/types/period"
import type { RegistryAccess } from "@/app/_lib/types/registry"
import type { TicketViewerFacts } from "@/app/_lib/types/ticket"

export { OPERATIONS_TABS } from "@/app/_lib/domain/operations-tabs"

export const OPERATIONS_PATH = "/operations"

export const OPERATIONS_LABEL = "Operação"

export const OPERATIONS_TAB_PARAM = "aba"

export const OPERATIONS_DEPARTMENT_PARAM = "setor"

export const OPERATIONS_DEPARTMENT_FILTER_LABEL = "Setor"

export const DEFAULT_OPERATIONS_TAB: OperationsTab = "minha-meta"

export const OPERATIONS_TAB_LABELS = {
  "minha-meta": "Minha meta",
  time: "Time",
  producao: "Produção",
} satisfies Record<OperationsTab, string>

export const OPERATIONS_TAB_GROUP_LABEL = "Visão da operação"

export const OPERATIONS_PERIOD_PRESETS = PRESET_PERIODS

export const DEFAULT_OPERATIONS_PERIOD: PeriodSelection = { periodo: "mes" }

export const usesOperationsPeriod = (tab: OperationsTab): boolean =>
  tab === "producao"

export const usesOperationsDepartment = (tab: OperationsTab): boolean =>
  tab !== "minha-meta"

export const OPERATIONS_UNASSIGNED_MESSAGE =
  TICKET_CREATION_BLOCK_MESSAGES.DEPARTMENT_UNASSIGNED

export const hasOperations = (facts: OperationsAccessFacts | null): boolean =>
  facts !== null && !facts.isUnassigned

export const operationsDepartmentOptions = (
  viewer: TicketViewerFacts,
  options: readonly DepartmentOption[],
): DepartmentOption[] => (viewer.isBoard ? assignableDepartments(options) : [])

export const operationsDepartmentParamFor = (
  viewer: TicketViewerFacts,
  departmentId: number,
): number | null => (departmentId === viewer.departmentId ? null : departmentId)

export const applicableOperationsDepartmentId = (
  viewer: TicketViewerFacts,
  requestedDepartmentId: number | null,
  options: readonly DepartmentOption[],
): number | null => {
  if (!viewer.isBoard || requestedDepartmentId === null) return null
  if (!options.some((option) => option.id === requestedDepartmentId)) {
    return null
  }
  return operationsDepartmentParamFor(viewer, requestedDepartmentId)
}

export const operationsDepartmentIdFor = (
  viewer: TicketViewerFacts,
  appliedDepartmentId: number | null,
): number => appliedDepartmentId ?? viewer.departmentId

export const canEditDepartmentGoals = (
  access: RegistryAccess,
  target: GoalTargetDepartment,
): boolean => canManageDepartmentSettings(access, target)

export const GOALS_UNDEFINED_TITLE = "Metas ainda não definidas"

export const GOALS_UNDEFINED_MEMBER_DESCRIPTION =
  "O administrador do setor ainda não definiu as metas da operação. Quando forem definidas, sua meta e as metas do time aparecem aqui."

export const GOALS_UNDEFINED_EDITOR_DESCRIPTION =
  "Defina as metas de SLA, TMA, horas em atraso, backlog e aceite de transferências. Elas valem para cada pessoa do setor e para o time."

export const goalsUndefinedCopy = (canEdit: boolean): OperationsEmptyCopy => ({
  title: GOALS_UNDEFINED_TITLE,
  description: canEdit
    ? GOALS_UNDEFINED_EDITOR_DESCRIPTION
    : GOALS_UNDEFINED_MEMBER_DESCRIPTION,
})

export const operationsSubtitle = (
  departmentName: string,
  goals: DepartmentGoalsRecord | null,
  now: Date,
): string => {
  const scope = `${departmentName} · metas de ${formatMonthYear(now)}`
  if (goals === null) return scope
  const author =
    goals.updatedByName === null ? "" : ` por ${goals.updatedByName}`
  return `${scope} · definidas${author} em ${formatDate(goals.updatedAt)}`
}

export const MY_GOAL_CARD_LABEL = "Minha meta"

export const TEAM_GOAL_CARD_LABEL = "Meta do time"

export const TEAM_MET_COUNT_CARD_LABEL = "Pessoas que cumpriram a meta"

export const PRODUCTION_CARD_LABEL = "Chamados resolvidos por pessoa"

export const PRODUCTION_SCROLL_REGION_LABEL =
  "Gráfico de barras da produção; os valores estão na tabela a seguir"

export const PRODUCTION_LOADING_LABEL =
  "Carregando chamados resolvidos por pessoa"

export const productionCountLabel = (count: number): string =>
  `${count} ${count === 1 ? "resolvido" : "resolvidos"}`

export const productionEntryLabel = (entry: TeamProductionEntry): string =>
  `${entry.name}: ${productionCountLabel(Math.max(entry.resolvedCount, 0))}`

export const isProductionEmpty = (
  entries: readonly TeamProductionEntry[],
): boolean => entries.every((entry) => entry.resolvedCount <= 0)

export const PRODUCTION_EMPTY_COPY: OperationsEmptyCopy = {
  title: "Nenhum chamado resolvido no período",
  description:
    "Os chamados do setor resolvidos no período aparecem aqui, uma barra por pessoa ativa.",
}

export const PRODUCTION_NO_MEMBERS_COPY: OperationsEmptyCopy = {
  title: "Nenhuma pessoa ativa no setor",
  description:
    "Quando houver pessoas ativas no setor, a produção de cada uma aparece aqui.",
}

export const productionEmptyCopy = (
  entries: readonly TeamProductionEntry[],
): OperationsEmptyCopy | null => {
  if (entries.length === 0) return PRODUCTION_NO_MEMBERS_COPY
  return isProductionEmpty(entries) ? PRODUCTION_EMPTY_COPY : null
}

export const operationsTabContext = (tab: OperationsTab, now: Date): string => {
  switch (tab) {
    case "minha-meta":
      return `Suas metas de ${formatMonthName(now)}, de ${formatMonthFirstDay(now)} até hoje`
    case "time":
      return "Metas do setor · backlog é de agora"
    case "producao":
      return "O período do gráfico fica no próprio card"
  }
}

export const GOALS_LOADING_LABEL = "Carregando metas"

export const PRODUCTION_PANEL_TITLE = "Produção da equipe"

export const PRODUCTION_SELF_LABEL = "Você"

export const peopleCountLabel = (count: number): string =>
  `${count} ${count === 1 ? "pessoa" : "pessoas"}`

export const productionTotalFor = (
  entries: readonly TeamProductionEntry[],
): number =>
  entries.reduce((sum, entry) => sum + Math.max(entry.resolvedCount, 0), 0)

export const productionSubtitle = (
  entries: readonly TeamProductionEntry[],
): string =>
  `${PRODUCTION_CARD_LABEL} · ${productionCountLabel(productionTotalFor(entries))} no período · ${peopleCountLabel(entries.length)}`

export const productionScrollHint = (count: number): string =>
  `Arraste para ver as ${peopleCountLabel(count)}.`
