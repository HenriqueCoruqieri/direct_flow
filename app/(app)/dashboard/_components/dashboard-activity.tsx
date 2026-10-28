import { listActivityBuckets } from "@/app/_lib/data/dashboard"
import { timeBuckets } from "@/app/_lib/date"
import {
  activityGranularityFor,
  activityPeriodLabel,
  buildActivitySeries,
  DASHBOARD_VIEW_MODES,
  isActivityEmpty,
} from "@/app/_lib/domain/dashboard"
import type { DashboardActivityByMode } from "@/app/_lib/types/dashboard"
import type { DateRange } from "@/app/_lib/types/period"

import ActivityLegend from "./activity-legend"
import DashboardActivityContent from "./dashboard-activity-content"
import DashboardActivityHeader from "./dashboard-activity-header"
import DashboardPanel from "./dashboard-panel"
import DashboardViewPane from "./dashboard-view-pane"

const TITLE_ID = "dashboard-activity-title"

interface DashboardActivityProps {
  departmentId: number
  userId: number
  range: DateRange
  now: Date
}

const DashboardActivity = async ({
  departmentId,
  userId,
  range,
  now,
}: DashboardActivityProps) => {
  const granularity = activityGranularityFor(range)
  const buckets = timeBuckets(range, granularity)
  const [coletivo, individual] = await Promise.all([
    listActivityBuckets(departmentId, buckets),
    listActivityBuckets(departmentId, buckets, userId),
  ])
  const pointsByMode: DashboardActivityByMode = {
    coletivo: buildActivitySeries(buckets, granularity, coletivo, now),
    individual: buildActivitySeries(buckets, granularity, individual, now),
  }

  return (
    <DashboardPanel aria-labelledby={TITLE_ID} className="xl:col-span-3">
      <DashboardActivityHeader
        titleId={TITLE_ID}
        periodLabel={activityPeriodLabel(range, granularity)}
      >
        {DASHBOARD_VIEW_MODES.filter(
          (mode) => !isActivityEmpty(pointsByMode[mode]),
        ).map((mode) => (
          <DashboardViewPane key={mode} mode={mode}>
            <ActivityLegend />
          </DashboardViewPane>
        ))}
      </DashboardActivityHeader>
      {DASHBOARD_VIEW_MODES.map((mode) => (
        <DashboardViewPane
          key={mode}
          mode={mode}
          className="flex flex-1 flex-col"
        >
          <DashboardActivityContent
            points={pointsByMode[mode]}
            mode={mode}
            range={range}
            granularity={granularity}
          />
        </DashboardViewPane>
      ))}
    </DashboardPanel>
  )
}

export default DashboardActivity
