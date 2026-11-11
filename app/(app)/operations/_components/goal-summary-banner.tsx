import { CircleCheckIcon, CircleXIcon } from "lucide-react"

import { goalSummaryLabel } from "@/app/_lib/domain/department-goals"
import type { GoalSummary } from "@/app/_lib/types/operations"
import { cn } from "@/app/_lib/utils"

interface GoalSummaryBannerProps {
  title: string
  summary: GoalSummary
  description: string
}

const GoalSummaryBanner = ({
  title,
  summary,
  description,
}: GoalSummaryBannerProps) => {
  const Icon = summary.met ? CircleCheckIcon : CircleXIcon

  return (
    <section
      aria-label={title}
      className="flex flex-col gap-2 rounded-2xl border border-border-subtle bg-surface p-4 sm:flex-row sm:items-center sm:gap-4"
    >
      <span
        className={cn(
          "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-bold",
          summary.met
            ? "border-status-resolvido/30 bg-status-resolvido/10 text-status-resolvido"
            : "border-destructive/30 bg-destructive/10 text-destructive",
        )}
      >
        <Icon aria-hidden="true" className="size-4" />
        {goalSummaryLabel(summary)}
      </span>
      <p className="text-sm text-text-secondary">{description}</p>
    </section>
  )
}

export default GoalSummaryBanner
