import {
  DAILY_ACTIVITY_SERIES,
  DAILY_ACTIVITY_SERIES_COLORS,
  DAILY_ACTIVITY_SERIES_LABELS,
} from "@/app/_lib/domain/dashboard"

const DailyActivityLegend = () => {
  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {DAILY_ACTIVITY_SERIES.map((series) => (
        <li
          key={series}
          className="flex items-center gap-1.5 text-caption text-muted-foreground"
        >
          <span
            aria-hidden="true"
            className="h-0.5 w-3 rounded-full"
            style={{ backgroundColor: DAILY_ACTIVITY_SERIES_COLORS[series] }}
          />
          {DAILY_ACTIVITY_SERIES_LABELS[series]}
        </li>
      ))}
    </ul>
  )
}

export default DailyActivityLegend
