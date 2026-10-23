interface ResolutionProgressProps {
  percent: number
  label: string
  valueText: string
}

const ResolutionProgress = ({
  percent,
  label,
  valueText,
}: ResolutionProgressProps) => {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={valueText}
      className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
    >
      <div
        className="h-full rounded-full bg-primary"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

export default ResolutionProgress
