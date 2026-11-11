import {
  PERSON_GOAL_INDICATORS,
  personGoalSummaryDescription,
} from "@/app/_lib/domain/department-goals"
import { MY_GOAL_CARD_LABEL } from "@/app/_lib/domain/operations"
import type { PersonGoalResult } from "@/app/_lib/types/operations"

import GoalGaugeCard from "./goal-gauge-card"
import GoalSummaryBanner from "./goal-summary-banner"

interface MyGoalPanelProps {
  result: PersonGoalResult
}

const MyGoalPanel = ({ result }: MyGoalPanelProps) => {
  return (
    <div className="flex flex-col gap-3">
      <GoalSummaryBanner
        title={MY_GOAL_CARD_LABEL}
        summary={result.summary}
        description={personGoalSummaryDescription(result)}
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {PERSON_GOAL_INDICATORS.map((indicator) => (
          <GoalGaugeCard
            key={indicator}
            evaluation={result.evaluations[indicator]}
          />
        ))}
      </div>
    </div>
  )
}

export default MyGoalPanel
