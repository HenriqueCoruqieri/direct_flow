import { Skeleton } from "@/app/_components/ui/skeleton"
import {
  DAILY_ACTIVITY_LOADING_LABEL,
  DAILY_ACTIVITY_SERIES,
} from "@/app/_lib/domain/dashboard"

import DashboardDailyActivityHeader from "./dashboard-daily-activity-header"
import DashboardPanel from "./dashboard-panel"

const DashboardDailyActivitySkeleton = () => {
  return (
    <DashboardPanel
      aria-busy="true"
      aria-label={DAILY_ACTIVITY_LOADING_LABEL}
      className="xl:col-span-3"
    >
      <DashboardDailyActivityHeader>
        <div className="flex items-center gap-3">
          {DAILY_ACTIVITY_SERIES.map((series) => (
            <Skeleton key={series} className="h-4 w-16" />
          ))}
        </div>
      </DashboardDailyActivityHeader>
      <Skeleton className="mt-3 min-h-56 flex-1" />
    </DashboardPanel>
  )
}

export default DashboardDailyActivitySkeleton
