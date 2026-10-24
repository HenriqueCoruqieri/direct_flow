import { Skeleton } from "@/app/_components/ui/skeleton"
import {
  ACTIVITY_LOADING_LABEL,
  ACTIVITY_SERIES,
  activityGranularityFor,
  activityPeriodLabel,
} from "@/app/_lib/domain/dashboard"
import type { DateRange } from "@/app/_lib/types/period"

import DashboardActivityHeader from "./dashboard-activity-header"
import DashboardPanel from "./dashboard-panel"

interface DashboardActivitySkeletonProps {
  range: DateRange
}

const DashboardActivitySkeleton = ({
  range,
}: DashboardActivitySkeletonProps) => {
  const granularity = activityGranularityFor(range)

  return (
    <DashboardPanel
      aria-busy="true"
      aria-label={ACTIVITY_LOADING_LABEL}
      className="xl:col-span-3"
    >
      <DashboardActivityHeader
        periodLabel={activityPeriodLabel(range, granularity)}
      >
        <div className="flex items-center gap-3">
          {ACTIVITY_SERIES.map((series) => (
            <Skeleton key={series} className="h-4 w-16" />
          ))}
        </div>
      </DashboardActivityHeader>
      <Skeleton className="mt-3 min-h-56 flex-1" />
    </DashboardPanel>
  )
}

export default DashboardActivitySkeleton
