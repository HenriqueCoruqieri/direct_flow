import type {
  GOAL_INDICATORS,
  PERSON_GOAL_INDICATORS,
} from "@/app/_lib/domain/goal-indicators"
import type { OPERATIONS_TABS } from "@/app/_lib/domain/operations-tabs"
import type { DepartmentAvailability } from "@/app/_lib/types/department"
import type { PeriodSelection } from "@/app/_lib/types/period"

export type OperationsTab = (typeof OPERATIONS_TABS)[number]

export interface OperationsLocation {
  tab: OperationsTab
  period: PeriodSelection
  departmentId: number | null
}

export interface OperationsAccessFacts {
  isUnassigned: boolean
}

export type GoalIndicator = (typeof GOAL_INDICATORS)[number]

export type PersonGoalIndicator = (typeof PERSON_GOAL_INDICATORS)[number]

export type TeamOnlyGoalIndicator = Exclude<GoalIndicator, PersonGoalIndicator>

export type GoalUnit = "percent" | "duration" | "count"

export type GoalDirection = "min" | "max"

export interface GoalIndicatorRule {
  unit: GoalUnit
  direction: GoalDirection
}

export interface DepartmentGoals {
  slaMinPercent: number
  tmaMaxHours: number
  overdueHoursLimit: number
  overdueTicketsLimit: number
  tmrMaxHours: number | null
}

export interface DepartmentGoalsRecord extends DepartmentGoals {
  departmentId: number
  updatedAt: Date
  updatedByName: string | null
}

export interface GoalTargetDepartment extends DepartmentAvailability {
  id: number
}

export interface GoalResolutionFacts {
  resolvedCount: number
  slaMetCount: number
  averageResolutionMs: number | null
}

export interface PersonGoalFacts extends GoalResolutionFacts {
  overdueMs: number
}

export interface TeamMemberGoalFacts extends PersonGoalFacts {
  userId: number
  name: string
  image: string | null
}

export interface TeamTmrFacts {
  queueWaitCount: number
  averageQueueWaitMs: number | null
}

export interface TeamGoalFacts extends PersonGoalFacts, TeamTmrFacts {
  overdueTicketCount: number
  members: TeamMemberGoalFacts[]
}

export type GoalAdherence =
  "adherent" | "not_adherent" | "no_data" | "no_target"

export type MeasuredGoalAdherence = Exclude<
  GoalAdherence,
  "no_data" | "no_target"
>

export interface MeasuredGoalEvaluation {
  indicator: GoalIndicator
  adherence: MeasuredGoalAdherence
  value: number
  target: number
}

export interface UnmeasuredGoalEvaluation {
  indicator: GoalIndicator
  adherence: "no_data"
  value: null
  target: number
}

export interface UntargetedGoalEvaluation {
  indicator: GoalIndicator
  adherence: "no_target"
  value: number | null
  target: null
}

export type GoalEvaluation =
  MeasuredGoalEvaluation | UnmeasuredGoalEvaluation | UntargetedGoalEvaluation

export type GoalEvaluations<TIndicator extends GoalIndicator> = Record<
  TIndicator,
  GoalEvaluation
>

export interface GoalMetSummary {
  met: true
}

export interface GoalNotMetSummary {
  met: false
  failed: GoalIndicator[]
}

export type GoalSummary = GoalMetSummary | GoalNotMetSummary

export interface PersonGoalResult {
  evaluations: GoalEvaluations<PersonGoalIndicator>
  summary: GoalSummary
}

export interface TeamGoalResult {
  evaluations: GoalEvaluations<GoalIndicator>
  summary: GoalSummary
  metCount: number
  memberCount: number
}

export interface GoalGauge {
  max: number
  fillPercent: number
  targetPercent: number | null
}

export interface GoalFieldCopy {
  label: string
  description: string
  unit: string
}

export interface OperationsEmptyCopy {
  title: string
  description: string
}

export interface TeamProductionEntry {
  userId: number
  name: string
  image: string | null
  resolvedCount: number
}
