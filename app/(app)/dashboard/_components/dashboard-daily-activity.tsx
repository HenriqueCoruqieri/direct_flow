import { listDailyActivity } from "@/app/_lib/data/dashboard"
import { lastDayWindows, todayKey } from "@/app/_lib/date"
import {
  buildDailyActivitySeries,
  DAILY_ACTIVITY_CARD_LABEL,
  DAILY_ACTIVITY_DAY_COLUMN_LABEL,
  DAILY_ACTIVITY_DAYS,
  DAILY_ACTIVITY_SERIES,
  DAILY_ACTIVITY_SERIES_LABELS,
  EMPTY_DAILY_ACTIVITY_DESCRIPTION,
  EMPTY_DAILY_ACTIVITY_TITLE,
  isDailyActivityEmpty,
} from "@/app/_lib/domain/dashboard"

import DailyActivityChart from "./daily-activity-chart"
import DailyActivityLegend from "./daily-activity-legend"
import DashboardDailyActivityHeader from "./dashboard-daily-activity-header"
import DashboardPanel from "./dashboard-panel"

const TITLE_ID = "dashboard-daily-activity-title"

interface DashboardDailyActivityProps {
  departmentId: number
  now: Date
}

const DashboardDailyActivity = async ({
  departmentId,
  now,
}: DashboardDailyActivityProps) => {
  const days = lastDayWindows(DAILY_ACTIVITY_DAYS, now)
  const counts = await listDailyActivity(departmentId, days)
  const points = buildDailyActivitySeries(days, counts, todayKey(now))
  const isEmpty = isDailyActivityEmpty(points)

  return (
    <DashboardPanel aria-labelledby={TITLE_ID} className="xl:col-span-3">
      <DashboardDailyActivityHeader titleId={TITLE_ID}>
        {isEmpty ? null : <DailyActivityLegend />}
      </DashboardDailyActivityHeader>
      {isEmpty ? (
        <div className="mt-3 flex min-h-56 flex-1 flex-col items-center justify-center gap-1 text-center">
          <p className="text-sm font-semibold">{EMPTY_DAILY_ACTIVITY_TITLE}</p>
          <p className="text-caption text-muted-foreground">
            {EMPTY_DAILY_ACTIVITY_DESCRIPTION}
          </p>
        </div>
      ) : (
        <>
          <div className="relative mt-3 min-h-56 flex-1">
            <DailyActivityChart points={points} />
          </div>
          <div className="sr-only">
            <table>
              <caption>{DAILY_ACTIVITY_CARD_LABEL}</caption>
              <thead>
                <tr>
                  <th scope="col">{DAILY_ACTIVITY_DAY_COLUMN_LABEL}</th>
                  {DAILY_ACTIVITY_SERIES.map((series) => (
                    <th key={series} scope="col">
                      {DAILY_ACTIVITY_SERIES_LABELS[series]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {points.map((point) => (
                  <tr key={point.key}>
                    <th scope="row">{point.longLabel}</th>
                    {DAILY_ACTIVITY_SERIES.map((series) => (
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

export default DashboardDailyActivity
