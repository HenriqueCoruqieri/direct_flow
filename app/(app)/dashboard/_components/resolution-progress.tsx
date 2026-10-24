import {
  formatResolutionRate,
  RESOLUTION_BAR_MAX_PERCENT,
} from "@/app/_lib/domain/dashboard"

interface ResolutionProgressProps {
  percent: number
  barPercent: number
  label: string
}

const ResolutionProgress = ({
  percent,
  barPercent,
  label,
}: ResolutionProgressProps) => {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={RESOLUTION_BAR_MAX_PERCENT}
      aria-valuenow={barPercent}
      aria-valuetext={formatResolutionRate(percent)}
      className="h-1 w-full shrink-0 overflow-hidden rounded-full bg-muted"
    >
      <div
        className="h-full rounded-full bg-primary"
        style={{ width: `${barPercent}%` }}
      />
    </div>
  )
}

export default ResolutionProgress
