import {
  GOAL_INDICATOR_LABELS,
  goalGaugeFor,
  goalScaleLabel,
  goalSupportLine,
  goalTargetLabel,
  goalValueLabel,
} from "@/app/_lib/domain/department-goals"
import type { GoalEvaluation } from "@/app/_lib/types/operations"

import GoalAdherenceBadge from "./goal-adherence-badge"
import GoalGauge from "./goal-gauge"
import GoalValue from "./goal-value"

interface GoalGaugeCardProps {
  evaluation: GoalEvaluation
}

const GoalGaugeCard = ({ evaluation }: GoalGaugeCardProps) => {
  const gauge = goalGaugeFor(evaluation)

  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border-subtle bg-surface p-4">
      <h3 className="text-caption font-semibold text-muted-foreground">
        {GOAL_INDICATOR_LABELS[evaluation.indicator]}
      </h3>
      <div className="flex min-w-0 items-center gap-4 sm:flex-col sm:items-center sm:gap-3">
        <div className="flex shrink-0 flex-col gap-1">
          <div className="relative h-20 w-36">
            <GoalGauge
              fillPercent={gauge.fillPercent}
              targetPercent={gauge.targetPercent}
              adherence={evaluation.adherence}
            />
            <div className="absolute inset-x-0 bottom-0 flex justify-center">
              <GoalValue label={goalValueLabel(evaluation)} />
            </div>
          </div>
          <div
            aria-hidden="true"
            className="flex justify-between text-micro text-muted-foreground tabular-nums"
          >
            <span>{goalScaleLabel(evaluation.indicator, 0)}</span>
            <span>{goalScaleLabel(evaluation.indicator, gauge.max)}</span>
          </div>
        </div>
        <div className="flex min-w-0 flex-col items-start gap-1.5 sm:items-center sm:text-center">
          <p className="text-caption text-text-secondary">
            {goalTargetLabel(evaluation)}
          </p>
          <GoalAdherenceBadge adherence={evaluation.adherence} />
          <p className="text-caption font-bold">
            {goalSupportLine(evaluation)}
          </p>
        </div>
      </div>
    </section>
  )
}

export default GoalGaugeCard
