import { findTeamGoalFacts } from "@/app/_lib/data/department-goals"
import { monthToDateRange } from "@/app/_lib/date"
import { teamGoalResultFor } from "@/app/_lib/domain/department-goals"
import type { DepartmentGoals } from "@/app/_lib/types/operations"

import TeamGoalPanel from "./team-goal-panel"

interface TeamGoalSectionProps {
  departmentId: number
  goals: DepartmentGoals
  now: Date
}

const TeamGoalSection = async ({
  departmentId,
  goals,
  now,
}: TeamGoalSectionProps) => {
  const facts = await findTeamGoalFacts(
    departmentId,
    monthToDateRange(now),
    now,
  )

  return <TeamGoalPanel result={teamGoalResultFor(goals, facts)} />
}

export default TeamGoalSection
