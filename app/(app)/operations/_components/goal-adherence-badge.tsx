import { CheckIcon, MinusIcon, XIcon } from "lucide-react"

import { Badge } from "@/app/_components/ui/badge"
import { GOAL_ADHERENCE_LABELS } from "@/app/_lib/domain/department-goals"
import type { GoalAdherence } from "@/app/_lib/types/operations"
import { cn } from "@/app/_lib/utils"

const ADHERENCE_CLASSES = {
  adherent:
    "border-status-resolvido/30 bg-status-resolvido/10 text-status-resolvido",
  not_adherent: "border-destructive/30 bg-destructive/10 text-destructive",
  no_data: "border-border-strong bg-surface-muted text-muted-foreground",
} satisfies Record<GoalAdherence, string>

const ADHERENCE_ICONS = {
  adherent: CheckIcon,
  not_adherent: XIcon,
  no_data: MinusIcon,
} satisfies Record<GoalAdherence, typeof CheckIcon>

interface GoalAdherenceBadgeProps {
  adherence: GoalAdherence
}

const GoalAdherenceBadge = ({ adherence }: GoalAdherenceBadgeProps) => {
  const Icon = ADHERENCE_ICONS[adherence]

  return (
    <Badge
      variant="outline"
      className={cn("font-semibold", ADHERENCE_CLASSES[adherence])}
    >
      <Icon aria-hidden="true" className="size-3" />
      {GOAL_ADHERENCE_LABELS[adherence]}
    </Badge>
  )
}

export default GoalAdherenceBadge
