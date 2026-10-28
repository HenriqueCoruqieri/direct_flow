import {
  ACTIVITY_BUCKET_COLUMN_LABELS,
  ACTIVITY_SERIES,
  ACTIVITY_SERIES_LABELS,
  activityTableCaption,
  EMPTY_ACTIVITY_COPY,
  isActivityEmpty,
  recordedActivityPoints,
} from "@/app/_lib/domain/dashboard"
import type {
  DashboardActivityPoint,
  DashboardViewMode,
} from "@/app/_lib/types/dashboard"
import type { DateRange, TimeBucketGranularity } from "@/app/_lib/types/period"

import ActivityChart from "./activity-chart"

interface DashboardActivityContentProps {
  points: DashboardActivityPoint[]
  mode: DashboardViewMode
  range: DateRange
  granularity: TimeBucketGranularity
}

const DashboardActivityContent = ({
  points,
  mode,
  range,
  granularity,
}: DashboardActivityContentProps) => {
  if (isActivityEmpty(points)) {
    const copy = EMPTY_ACTIVITY_COPY[mode]
    return (
      <div className="mt-3 flex min-h-56 flex-1 flex-col items-center justify-center gap-1 text-center">
        <p className="text-sm font-semibold">{copy.title}</p>
        <p className="text-caption text-muted-foreground">
          {copy.descriptions[granularity]}
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="relative mt-3 min-h-56 flex-1">
        <ActivityChart points={points} mode={mode} />
      </div>
      <div className="sr-only">
        <table>
          <caption>{activityTableCaption(range, granularity, mode)}</caption>
          <thead>
            <tr>
              <th scope="col">{ACTIVITY_BUCKET_COLUMN_LABELS[granularity]}</th>
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
  )
}

export default DashboardActivityContent
