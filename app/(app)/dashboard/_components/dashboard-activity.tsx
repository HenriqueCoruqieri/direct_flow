import { listActivityBuckets } from "@/app/_lib/data/dashboard"
import { timeBuckets } from "@/app/_lib/date"
import {
  ACTIVITY_BUCKET_COLUMN_LABELS,
  ACTIVITY_SERIES,
  ACTIVITY_SERIES_LABELS,
  activityGranularityFor,
  activityPeriodLabel,
  activityTableCaption,
  buildActivitySeries,
  EMPTY_ACTIVITY_DESCRIPTIONS,
  EMPTY_ACTIVITY_TITLE,
  isActivityEmpty,
  recordedActivityPoints,
} from "@/app/_lib/domain/dashboard"
import type { DateRange } from "@/app/_lib/types/period"

import ActivityChart from "./activity-chart"
import ActivityLegend from "./activity-legend"
import DashboardActivityHeader from "./dashboard-activity-header"
import DashboardPanel from "./dashboard-panel"

const TITLE_ID = "dashboard-activity-title"

interface DashboardActivityProps {
  departmentId: number
  range: DateRange
  now: Date
}

const DashboardActivity = async ({
  departmentId,
  range,
  now,
}: DashboardActivityProps) => {
  const granularity = activityGranularityFor(range)
  const buckets = timeBuckets(range, granularity)
  const counts = await listActivityBuckets(departmentId, buckets)
  const points = buildActivitySeries(buckets, granularity, counts, now)
  const isEmpty = isActivityEmpty(points)

  return (
    <DashboardPanel aria-labelledby={TITLE_ID} className="xl:col-span-3">
      <DashboardActivityHeader
        titleId={TITLE_ID}
        periodLabel={activityPeriodLabel(range, granularity)}
      >
        {isEmpty ? null : <ActivityLegend />}
      </DashboardActivityHeader>
      {isEmpty ? (
        <div className="mt-3 flex min-h-56 flex-1 flex-col items-center justify-center gap-1 text-center">
          <p className="text-sm font-semibold">{EMPTY_ACTIVITY_TITLE}</p>
          <p className="text-caption text-muted-foreground">
            {EMPTY_ACTIVITY_DESCRIPTIONS[granularity]}
          </p>
        </div>
      ) : (
        <>
          <div className="relative mt-3 min-h-56 flex-1">
            <ActivityChart points={points} />
          </div>
          <div className="sr-only">
            <table>
              <caption>{activityTableCaption(range, granularity)}</caption>
              <thead>
                <tr>
                  <th scope="col">
                    {ACTIVITY_BUCKET_COLUMN_LABELS[granularity]}
                  </th>
                  {ACTIVITY_SERIES.map((series) => (
                    <th key={series} scope="col">
                      {ACTIVITY_SERIES_LABELS[series]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recordedActivityPoints(points).map((point) => (
                  <tr key={point.key}>
                    <th scope="row">{point.longLabel}</th>
                    {ACTIVITY_SERIES.map((series) => (
                      <td key={series}>{point[series]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </DashboardPanel>
  )
}

export default DashboardActivity
