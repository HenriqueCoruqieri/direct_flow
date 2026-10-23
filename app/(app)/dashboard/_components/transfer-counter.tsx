import type { DashboardTransferCounterTone } from "@/app/_lib/types/dashboard"
import { cn } from "@/app/_lib/utils"

const CONTAINER_TONE_CLASSES = {
  highlight: "border-warning-border bg-warning",
  alert: "border-transparent bg-surface-muted",
  neutral: "border-transparent bg-surface-muted",
} satisfies Record<DashboardTransferCounterTone, string>

const VALUE_TONE_CLASSES = {
  highlight: "text-warning-foreground",
  alert: "text-warning-foreground",
  neutral: "text-foreground",
} satisfies Record<DashboardTransferCounterTone, string>

interface TransferCounterProps {
  label: string
  count: number
  tone: DashboardTransferCounterTone
  hint?: string
}

const TransferCounter = ({
  label,
  count,
  tone,
  hint,
}: TransferCounterProps) => {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-xl border p-3",
        CONTAINER_TONE_CLASSES[tone],
      )}
    >
      <dt className="text-xs leading-snug font-semibold wrap-break-word text-muted-foreground">
        {label}
      </dt>
      {hint === undefined ? null : (
        <dd className="text-xs text-muted-foreground">{hint}</dd>
      )}
      <dd
        className={cn(
          "mt-auto pt-1 font-heading text-title leading-none font-semibold tabular-nums",
          VALUE_TONE_CLASSES[tone],
        )}
      >
        {count}
      </dd>
    </div>
  )
}

export default TransferCounter
