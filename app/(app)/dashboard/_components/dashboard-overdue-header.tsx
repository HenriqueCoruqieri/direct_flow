import Link from "next/link"

import {
  OVERDUE_CARD_LABEL,
  OVERDUE_QUEUE_LINK_LABEL,
} from "@/app/_lib/domain/dashboard"
import { OVERDUE_QUEUE_HREF } from "@/app/_lib/validation/dashboard"

interface DashboardOverdueHeaderProps {
  titleId?: string
}

const DashboardOverdueHeader = ({ titleId }: DashboardOverdueHeaderProps) => {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2
        id={titleId}
        className="text-caption font-semibold text-muted-foreground"
      >
        {OVERDUE_CARD_LABEL}
      </h2>
      <Link
        href={OVERDUE_QUEUE_HREF}
        className="shrink-0 rounded-sm text-caption font-semibold text-primary transition-colors outline-none hover:text-primary-hover focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {OVERDUE_QUEUE_LINK_LABEL}
      </Link>
    </div>
  )
}

export default DashboardOverdueHeader
