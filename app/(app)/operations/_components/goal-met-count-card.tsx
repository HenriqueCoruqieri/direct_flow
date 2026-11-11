import {
  goalMetCountDescription,
  goalMetCountLabel,
} from "@/app/_lib/domain/department-goals"
import { TEAM_MET_COUNT_CARD_LABEL } from "@/app/_lib/domain/operations"

import GoalMetRing from "./goal-met-ring"

interface GoalMetCountCardProps {
  metCount: number
  memberCount: number
}

const GoalMetCountCard = ({ metCount, memberCount }: GoalMetCountCardProps) => {
  const percent = memberCount > 0 ? (metCount / memberCount) * 100 : 0

  return (
    <section className="flex items-center gap-4 rounded-2xl border border-border-subtle bg-surface p-4">
      <div className="relative size-22 shrink-0">
        <GoalMetRing percent={percent} />
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center font-mono text-lg font-semibold tabular-nums"
        >
          {metCount}/{memberCount}
        </span>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="text-caption font-semibold text-muted-foreground">
          {TEAM_MET_COUNT_CARD_LABEL}
        </h3>
        <p className="text-base font-bold">
          {goalMetCountLabel(metCount, memberCount)}
        </p>
        <p className="text-sm text-text-secondary">
          {goalMetCountDescription(metCount, memberCount)}
        </p>
      </div>
    </section>
  )
}

export default GoalMetCountCard
