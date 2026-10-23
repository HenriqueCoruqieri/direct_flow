import { tagBarPercent } from "@/app/_lib/domain/dashboard"

interface TopTagItemProps {
  name: string
  count: number
  maxCount: number
}

const TopTagItem = ({ name, count, maxCount }: TopTagItemProps) => {
  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex min-w-0 items-baseline justify-between gap-3 text-sm">
        <span title={name} className="truncate font-medium">
          {name}
        </span>
        <span className="shrink-0 text-text-secondary tabular-nums">
          {count}
        </span>
      </div>
      <div
        aria-hidden="true"
        className="h-1 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${tagBarPercent(count, maxCount)}%` }}
        />
      </div>
    </li>
  )
}

export default TopTagItem
