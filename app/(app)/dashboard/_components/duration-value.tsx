import { durationParts, formatDuration } from "@/app/_lib/date"

interface DurationValueProps {
  durationMs: number
}

const DurationValue = ({ durationMs }: DurationValueProps) => {
  return (
    <span
      title={formatDuration(durationMs)}
      className="inline-flex items-baseline gap-1.5"
    >
      {durationParts(durationMs).map((part) => (
        <span key={part.unit}>
          {part.value}
          <span className="text-base">{part.unit}</span>
        </span>
      ))}
    </span>
  )
}

export default DurationValue
