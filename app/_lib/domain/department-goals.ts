import {
  formatDateAtTime,
  formatHoursMinutes,
  formatInteger,
  HOUR_MS,
} from "@/app/_lib/date"
import { ticketCountLabel } from "@/app/_lib/domain/dashboard"
import {
  GOAL_INDICATORS,
  PERSON_GOAL_INDICATORS,
} from "@/app/_lib/domain/goal-indicators"
import { EMPTY_VALUE_LABEL } from "@/app/_lib/domain/labels"
import type {
  DepartmentGoals,
  DepartmentGoalsRecord,
  GoalAdherence,
  GoalDirection,
  GoalEvaluation,
  GoalEvaluations,
  GoalFieldCopy,
  GoalGauge,
  GoalIndicator,
  GoalIndicatorRule,
  GoalResolutionFacts,
  GoalSummary,
  GoalUnit,
  MeasuredGoalEvaluation,
  PersonGoalFacts,
  PersonGoalIndicator,
  PersonGoalResult,
  TeamGoalFacts,
  TeamGoalResult,
  TeamMemberGoalFacts,
  TeamOnlyGoalIndicator,
  TeamTransferReviewFacts,
} from "@/app/_lib/types/operations"

export { GOAL_INDICATORS, PERSON_GOAL_INDICATORS }

export const TEAM_ONLY_GOAL_INDICATORS = [
  "backlog",
  "transferAcceptance",
] as const satisfies readonly TeamOnlyGoalIndicator[]

export const GOAL_PERCENT_MIN = 1

export const GOAL_PERCENT_MAX = 100

export const GOAL_TMA_HOURS_MIN = 1

export const GOAL_TMA_HOURS_MAX = 999

export const GOAL_HOURS_LIMIT_MAX = 9999

export const GOAL_BACKLOG_MAX = 9999

export const GOAL_GAUGE_MIN_HOURS = 4

export const GOAL_GAUGE_MIN_COUNT = 4

export const GOAL_GAUGE_LIMIT_FACTOR = 2

export const GOAL_INDICATOR_RULES = {
  sla: { unit: "percent", direction: "min" },
  tma: { unit: "duration", direction: "max" },
  overdue: { unit: "duration", direction: "max" },
  backlog: { unit: "count", direction: "max" },
  transferAcceptance: { unit: "percent", direction: "min" },
} satisfies Record<GoalIndicator, GoalIndicatorRule>

export const GOAL_FIELD_BY_INDICATOR = {
  sla: "slaMinPercent",
  tma: "tmaMaxHours",
  overdue: "overdueHoursLimit",
  backlog: "backlogLimit",
  transferAcceptance: "transferAcceptanceMinPercent",
} as const satisfies Record<GoalIndicator, keyof DepartmentGoals>

export const GOAL_INDICATOR_LABELS = {
  sla: "SLA no prazo",
  tma: "Tempo médio de resolução",
  overdue: "Horas em atraso",
  backlog: "Backlog",
  transferAcceptance: "Aceite de transferências",
} satisfies Record<GoalIndicator, string>

export const GOAL_INDICATOR_SHORT_LABELS = {
  sla: "SLA",
  tma: "TMA",
  overdue: "horas em atraso",
  backlog: "backlog",
  transferAcceptance: "aceite de transferências",
} satisfies Record<GoalIndicator, string>

export const GOAL_ADHERENCE_LABELS = {
  adherent: "Aderente",
  not_adherent: "Não aderente",
  no_data: "Sem dados",
} satisfies Record<GoalAdherence, string>

export const GOAL_MET_LABEL = "Meta cumprida"

export const GOAL_NOT_MET_LABEL = "Meta não cumprida"

export const GOAL_NO_DATA_HINTS = {
  sla: "Nenhum chamado resolvido no mês",
  tma: "Nenhum chamado resolvido no mês",
  overdue: "Nenhum atraso no mês",
  backlog: "Nenhum chamado em backlog",
  transferAcceptance: "Nenhuma transferência revisada no mês",
} satisfies Record<GoalIndicator, string>

export const GOAL_ON_TARGET_HINTS = {
  percent: "Na meta",
  duration: "No limite",
  count: "No limite",
} satisfies Record<GoalUnit, string>

export const DEPARTMENT_GOALS_FIELD_COPY = {
  slaMinPercent: {
    label: "SLA mínimo",
    description:
      "Percentual mínimo de chamados resolvidos no mês dentro do prazo da prioridade.",
    unit: "%",
  },
  tmaMaxHours: {
    label: "TMA máximo",
    description:
      "Tempo médio máximo entre a abertura e a resolução dos chamados resolvidos no mês.",
    unit: "h",
  },
  overdueHoursLimit: {
    label: "Limite de horas em atraso",
    description:
      "Soma máxima das horas em atraso no mês, incluindo chamados já resolvidos.",
    unit: "h",
  },
  backlogLimit: {
    label: "Limite de backlog",
    description: "Quantidade máxima de chamados em aberto no setor agora.",
    unit: "chamados",
  },
  transferAcceptanceMinPercent: {
    label: "Taxa de aceite de transferências",
    description:
      "Percentual mínimo de transferências recebidas de outros setores aceitas no mês, entre as aceitas e as recusadas.",
    unit: "%",
  },
} satisfies Record<keyof DepartmentGoals, GoalFieldCopy>

export const PERSON_AND_TEAM_GOAL_FIELDS = [
  "slaMinPercent",
  "tmaMaxHours",
  "overdueHoursLimit",
] as const satisfies readonly (keyof DepartmentGoals)[]

export const TEAM_ONLY_GOAL_FIELDS = [
  "backlogLimit",
  "transferAcceptanceMinPercent",
] as const satisfies readonly (keyof DepartmentGoals)[]

export const PERSON_AND_TEAM_GOALS_GROUP_LABEL =
  "Metas de cada pessoa e do time"

export const TEAM_ONLY_GOALS_GROUP_LABEL = "Metas só do time"

export const EDIT_DEPARTMENT_GOALS_LABEL = "Editar metas"

export const DEFINE_DEPARTMENT_GOALS_LABEL = "Definir metas"

export const SAVE_DEPARTMENT_GOALS_LABEL = "Salvar metas"

export const SAVE_DEPARTMENT_GOALS_PENDING_LABEL = "Salvando…"

export const DEPARTMENT_GOALS_SAVED_MESSAGE = "Metas salvas."

export const departmentGoalsDialogDescription = (
  departmentName: string,
): string =>
  `${departmentName} · as metas valem para cada pessoa do setor e para o time.`

export const goalsLastChangeLabel = (record: DepartmentGoalsRecord): string =>
  record.updatedByName === null
    ? `Última alteração em ${formatDateAtTime(record.updatedAt)}.`
    : `Última alteração por ${record.updatedByName} em ${formatDateAtTime(record.updatedAt)}.`

const floorPercent = (part: number, whole: number): number =>
  Math.floor((Math.max(part, 0) * 100) / whole)

export const slaPercentFor = (facts: GoalResolutionFacts): number | null =>
  facts.resolvedCount > 0
    ? floorPercent(
        Math.min(facts.slaMetCount, facts.resolvedCount),
        facts.resolvedCount,
      )
    : null

export const averageResolutionFor = (
  facts: GoalResolutionFacts,
): number | null =>
  facts.resolvedCount > 0 && facts.averageResolutionMs !== null
    ? Math.max(facts.averageResolutionMs, 0)
    : null

export const transferAcceptancePercentFor = (
  facts: TeamTransferReviewFacts,
): number | null => {
  const approved = Math.max(facts.approvedCount, 0)
  const reviewed = approved + Math.max(facts.rejectedCount, 0)
  return reviewed > 0 ? floorPercent(approved, reviewed) : null
}

export const goalTargetFor = (
  indicator: GoalIndicator,
  goals: DepartmentGoals,
): number => {
  const target = goals[GOAL_FIELD_BY_INDICATOR[indicator]]
  return GOAL_INDICATOR_RULES[indicator].unit === "duration"
    ? target * HOUR_MS
    : target
}

export const isWithinGoal = (
  indicator: GoalIndicator,
  value: number,
  target: number,
): boolean =>
  GOAL_INDICATOR_RULES[indicator].direction === "min"
    ? value >= target
    : value <= target

export const evaluateGoal = (
  indicator: GoalIndicator,
  value: number | null,
  goals: DepartmentGoals,
): GoalEvaluation => {
  const target = goalTargetFor(indicator, goals)
  if (value === null) {
    return { indicator, adherence: "no_data", value: null, target }
  }
  return {
    indicator,
    adherence: isWithinGoal(indicator, value, target)
      ? "adherent"
      : "not_adherent",
    value,
    target,
  }
}

export const evaluatePersonGoals = (
  goals: DepartmentGoals,
  facts: PersonGoalFacts,
): GoalEvaluations<PersonGoalIndicator> => ({
  sla: evaluateGoal("sla", slaPercentFor(facts), goals),
  tma: evaluateGoal("tma", averageResolutionFor(facts), goals),
  overdue: evaluateGoal("overdue", Math.max(facts.overdueMs, 0), goals),
})

export const evaluateTeamGoals = (
  goals: DepartmentGoals,
  facts: TeamGoalFacts,
): GoalEvaluations<GoalIndicator> => ({
  ...evaluatePersonGoals(goals, facts),
  backlog: evaluateGoal("backlog", Math.max(facts.backlogCount, 0), goals),
  transferAcceptance: evaluateGoal(
    "transferAcceptance",
    transferAcceptancePercentFor(facts),
    goals,
  ),
})

export const goalSummaryFor = (
  evaluations: readonly GoalEvaluation[],
): GoalSummary => {
  const failed = evaluations
    .filter((evaluation) => evaluation.adherence === "not_adherent")
    .map((evaluation) => evaluation.indicator)
  return failed.length === 0 ? { met: true } : { met: false, failed }
}

export const isGoalMet = (evaluations: readonly GoalEvaluation[]): boolean =>
  goalSummaryFor(evaluations).met

const orderedEvaluations = <TIndicator extends GoalIndicator>(
  indicators: readonly TIndicator[],
  evaluations: GoalEvaluations<TIndicator>,
): GoalEvaluation[] => indicators.map((indicator) => evaluations[indicator])

export const isPersonGoalMet = (
  goals: DepartmentGoals,
  facts: PersonGoalFacts,
): boolean =>
  isGoalMet(
    orderedEvaluations(
      PERSON_GOAL_INDICATORS,
      evaluatePersonGoals(goals, facts),
    ),
  )

export const personGoalResultFor = (
  goals: DepartmentGoals,
  facts: PersonGoalFacts,
): PersonGoalResult => {
  const evaluations = evaluatePersonGoals(goals, facts)
  return {
    evaluations,
    summary: goalSummaryFor(
      orderedEvaluations(PERSON_GOAL_INDICATORS, evaluations),
    ),
  }
}

export const goalMetCountFor = (
  goals: DepartmentGoals,
  members: readonly TeamMemberGoalFacts[],
): number => members.filter((member) => isPersonGoalMet(goals, member)).length

export const teamGoalResultFor = (
  goals: DepartmentGoals,
  facts: TeamGoalFacts,
): TeamGoalResult => {
  const evaluations = evaluateTeamGoals(goals, facts)
  return {
    evaluations,
    summary: goalSummaryFor(orderedEvaluations(GOAL_INDICATORS, evaluations)),
    metCount: goalMetCountFor(goals, facts.members),
    memberCount: facts.members.length,
  }
}

const joinWithAnd = (items: readonly string[]): string => {
  if (items.length <= 1) return items.join("")
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`
}

export const goalSummaryLabel = (summary: GoalSummary): string =>
  summary.met
    ? GOAL_MET_LABEL
    : `${GOAL_NOT_MET_LABEL} · não aderente em ${joinWithAnd(
        summary.failed.map(
          (indicator) => GOAL_INDICATOR_SHORT_LABELS[indicator],
        ),
      )}`

export const NO_ACTIVE_MEMBERS_LABEL = "Nenhuma pessoa ativa no setor"

export const goalMetCountLabel = (
  metCount: number,
  memberCount: number,
): string => {
  if (memberCount <= 0) return NO_ACTIVE_MEMBERS_LABEL
  return `${metCount} de ${memberCount} ${metCount === 1 ? "cumpriu" : "cumpriram"}`
}

const formatGoalAmount = (unit: GoalUnit, amount: number): string => {
  switch (unit) {
    case "percent":
      return `${formatInteger(amount)}%`
    case "duration":
      return formatHoursMinutes(amount)
    case "count":
      return ticketCountLabel(amount)
  }
}

export const goalValueLabel = (evaluation: GoalEvaluation): string =>
  evaluation.value === null
    ? EMPTY_VALUE_LABEL
    : formatGoalAmount(
        GOAL_INDICATOR_RULES[evaluation.indicator].unit,
        evaluation.value,
      )

export const goalScaleLabel = (
  indicator: GoalIndicator,
  value: number,
): string => formatGoalAmount(GOAL_INDICATOR_RULES[indicator].unit, value)

export const GOAL_TARGET_PREFIXES = {
  sla: "Meta",
  tma: "Meta",
  overdue: "Limite",
  backlog: "Limite",
  transferAcceptance: "Meta",
} satisfies Record<GoalIndicator, string>

export const GOAL_DIRECTION_SYMBOLS = {
  min: "≥",
  max: "≤",
} satisfies Record<GoalDirection, string>

export const goalTargetLabel = (evaluation: GoalEvaluation): string => {
  const rule = GOAL_INDICATOR_RULES[evaluation.indicator]
  const amount = formatGoalAmount(rule.unit, evaluation.target)
  return `${GOAL_TARGET_PREFIXES[evaluation.indicator]} ${GOAL_DIRECTION_SYMBOLS[rule.direction]} ${amount}`
}

export const PERSON_GOAL_MET_DESCRIPTION =
  "Você está aderente nas metas individuais do mês: SLA, TMA e horas em atraso."

export const TEAM_GOAL_MET_DESCRIPTION =
  "O time está aderente nos cinco indicadores do mês."

const GOAL_MEASURE_PHRASES = {
  sla: (amount: string) => `SLA de ${amount}`,
  tma: (amount: string) => `TMA de ${amount}`,
  overdue: (amount: string) => `${amount} em atraso no mês`,
  backlog: (amount: string) => `Backlog de ${amount}`,
  transferAcceptance: (amount: string) =>
    `Aceite de transferências de ${amount}`,
} satisfies Record<GoalIndicator, (amount: string) => string>

export const goalShortfallSentence = (
  evaluation: MeasuredGoalEvaluation,
): string => {
  const rule = GOAL_INDICATOR_RULES[evaluation.indicator]
  const measure = GOAL_MEASURE_PHRASES[evaluation.indicator](
    formatGoalAmount(rule.unit, evaluation.value),
  )
  const target = formatGoalAmount(rule.unit, evaluation.target)
  const gap = Math.abs(evaluation.value - evaluation.target)
  return rule.direction === "min"
    ? `${measure}: ${formatInteger(gap)} p.p. abaixo da meta de ${target}.`
    : `${measure}: ${formatGoalAmount(rule.unit, gap)} acima do limite de ${target}.`
}

const isNotAdherent = (
  evaluation: GoalEvaluation,
): evaluation is MeasuredGoalEvaluation =>
  evaluation.adherence === "not_adherent"

const goalSummaryDescriptionFor = (
  evaluations: readonly GoalEvaluation[],
  metDescription: string,
): string => {
  const shortfalls = evaluations.filter(isNotAdherent)
  return shortfalls.length === 0
    ? metDescription
    : shortfalls.map(goalShortfallSentence).join(" ")
}

export const personGoalSummaryDescription = (
  result: PersonGoalResult,
): string =>
  goalSummaryDescriptionFor(
    orderedEvaluations(PERSON_GOAL_INDICATORS, result.evaluations),
    PERSON_GOAL_MET_DESCRIPTION,
  )

export const teamGoalSummaryDescription = (result: TeamGoalResult): string =>
  goalSummaryDescriptionFor(
    orderedEvaluations(GOAL_INDICATORS, result.evaluations),
    TEAM_GOAL_MET_DESCRIPTION,
  )

export const GOAL_MET_COUNT_RULE_DESCRIPTION =
  "Ficará aderente a meta caso atinja os indicadores de SLA, TMA e horas em atraso."

export const goalMetCountDescription = (
  metCount: number,
  memberCount: number,
): string => {
  if (memberCount <= 0) return GOAL_MET_COUNT_RULE_DESCRIPTION
  const people = memberCount === 1 ? "pessoa" : "pessoas"
  const verb = metCount === 1 ? "cumpriu" : "cumpriram"
  return `${metCount} de ${memberCount} ${people} ${verb} as três metas individuais (SLA, TMA e horas em atraso).`
}

const percentDifferenceLine = (difference: number): string => {
  if (difference === 0) return GOAL_ON_TARGET_HINTS.percent
  const points = `${formatInteger(Math.abs(difference))} p.p.`
  return difference > 0 ? `${points} acima da meta` : `Faltam ${points}`
}

const limitDifferenceLine = (unit: GoalUnit, difference: number): string => {
  if (difference === 0) return GOAL_ON_TARGET_HINTS[unit]
  const amount = formatGoalAmount(unit, Math.abs(difference))
  return difference > 0 ? `${amount} acima do limite` : `Folga de ${amount}`
}

export const goalSupportLine = (evaluation: GoalEvaluation): string => {
  if (evaluation.value === null) {
    return GOAL_NO_DATA_HINTS[evaluation.indicator]
  }
  const rule = GOAL_INDICATOR_RULES[evaluation.indicator]
  const difference = evaluation.value - evaluation.target
  return rule.direction === "min"
    ? percentDifferenceLine(difference)
    : limitDifferenceLine(rule.unit, difference)
}

const clampPercent = (value: number): number =>
  Math.min(Math.max(value, 0), 100)

export const goalGaugeMaxFor = (evaluation: GoalEvaluation): number => {
  switch (GOAL_INDICATOR_RULES[evaluation.indicator].unit) {
    case "percent":
      return GOAL_PERCENT_MAX
    case "duration":
      return Math.max(
        evaluation.target * GOAL_GAUGE_LIMIT_FACTOR,
        GOAL_GAUGE_MIN_HOURS * HOUR_MS,
      )
    case "count":
      return Math.max(
        evaluation.target * GOAL_GAUGE_LIMIT_FACTOR,
        GOAL_GAUGE_MIN_COUNT,
      )
  }
}

export const goalGaugeFor = (evaluation: GoalEvaluation): GoalGauge => {
  const max = goalGaugeMaxFor(evaluation)
  return {
    max,
    fillPercent:
      evaluation.value === null
        ? 0
        : clampPercent((evaluation.value / max) * 100),
    targetPercent: clampPercent((evaluation.target / max) * 100),
  }
}
