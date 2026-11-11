import { Skeleton } from "@/app/_components/ui/skeleton"
import {
  GOAL_INDICATORS,
  PERSON_GOAL_INDICATORS,
} from "@/app/_lib/domain/department-goals"
import { GOALS_LOADING_LABEL } from "@/app/_lib/domain/operations"
import { cn } from "@/app/_lib/utils"

import GoalGaugeCardSkeleton from "./goal-gauge-card-skeleton"

interface GoalPanelSkeletonProps {
  scope: "person" | "team"
}

const GoalPanelSkeleton = ({ scope }: GoalPanelSkeletonProps) => {
  const indicators = scope === "team" ? GOAL_INDICATORS : PERSON_GOAL_INDICATORS

  return (
    <div
      aria-busy="true"
      aria-label={GOALS_LOADING_LABEL}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-2 rounded-2xl border border-border-subtle bg-surface p-4 sm:flex-row sm:items-center sm:gap-4">
        <Skeleton className="h-7 w-40 rounded-full" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      {scope === "team" ? (
        <div className="flex items-center gap-4 rounded-2xl border border-border-subtle bg-surface p-4">
          <Skeleton className="size-22 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
        </div>
      ) : null}
      <div
        className={cn(
          "grid grid-cols-1 gap-3 md:grid-cols-3",
          scope === "team" && "xl:grid-cols-5",
        )}
      >
        {indicators.map((indicator) => (
          <GoalGaugeCardSkeleton key={indicator} />
        ))}
      </div>
    </div>
  )
}

export default GoalPanelSkeleton
