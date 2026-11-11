import { findPersonGoalFacts } from "@/app/_lib/data/department-goals"
import { monthToDateRange } from "@/app/_lib/date"
import { personGoalResultFor } from "@/app/_lib/domain/department-goals"
import type { DepartmentGoals } from "@/app/_lib/types/operations"

import MyGoalPanel from "./my-goal-panel"

interface MyGoalSectionProps {
  departmentId: number
  userId: number
  goals: DepartmentGoals
  now: Date
}

const MyGoalSection = async ({
  departmentId,
  userId,
  goals,
  now,
}: MyGoalSectionProps) => {
  const facts = await findPersonGoalFacts(
    departmentId,
    userId,
    monthToDateRange(now),
    now,
  )

  return <MyGoalPanel result={personGoalResultFor(goals, facts)} />
}

export default MyGoalSection
