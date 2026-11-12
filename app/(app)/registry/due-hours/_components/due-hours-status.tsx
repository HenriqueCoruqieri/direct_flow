import { Badge } from "@/app/_components/ui/badge"
import {
  DUE_HOURS_DEFAULT_BADGE,
  DUE_HOURS_DEFAULT_DESCRIPTION,
} from "@/app/_lib/domain/department-due-hours"
import type { DepartmentDueHoursView } from "@/app/_lib/types/department-due-hours"

interface DueHoursStatusProps {
  view: DepartmentDueHoursView
}

const DueHoursStatus = ({ view }: DueHoursStatusProps) => {
  if (view.isDefault) {
    return (
      <div className="flex flex-col items-start gap-1.5">
        <Badge variant="secondary">{DUE_HOURS_DEFAULT_BADGE}</Badge>
        <p className="text-caption text-muted-foreground">
          {DUE_HOURS_DEFAULT_DESCRIPTION}
        </p>
      </div>
    )
  }

  return view.lastChange !== null ? (
    <p className="text-caption text-muted-foreground">{view.lastChange}</p>
  ) : null
}

export default DueHoursStatus
