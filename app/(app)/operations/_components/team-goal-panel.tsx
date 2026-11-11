import {
  GOAL_INDICATORS,
  teamGoalSummaryDescription,
} from "@/app/_lib/domain/department-goals"
import { TEAM_GOAL_CARD_LABEL } from "@/app/_lib/domain/operations"
import type { TeamGoalResult } from "@/app/_lib/types/operations"

import GoalGaugeCard from "./goal-gauge-card"
import GoalMetCountCard from "./goal-met-count-card"
import GoalSummaryBanner from "./goal-summary-banner"

interface TeamGoalPanelProps {
  result: TeamGoalResult
}

const TeamGoalPanel = ({ result }: TeamGoalPanelProps) => {
  return (
    <div className="flex flex-col gap-3">
      <GoalSummaryBanner
        title={TEAM_GOAL_CARD_LABEL}
        summary={result.summary}
        description={teamGoalSummaryDescription(result)}
      />
      <GoalMetCountCard
        metCount={result.metCount}
        memberCount={result.memberCount}
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {GOAL_INDICATORS.map((indicator) => (
          <GoalGaugeCard
            key={indicator}
            evaluation={result.evaluations[indicator]}
          />
        ))}
      </div>
    </div>
  )
}

export default TeamGoalPanel
