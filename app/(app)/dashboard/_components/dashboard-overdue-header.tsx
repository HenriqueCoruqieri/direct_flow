import {
  OVERDUE_CARD_LABEL,
  OVERDUE_QUEUE_LINK_LABEL,
} from "@/app/_lib/domain/dashboard"
import { OVERDUE_QUEUE_HREF } from "@/app/_lib/validation/dashboard"

import DashboardPanelHeader from "./dashboard-panel-header"

interface DashboardOverdueHeaderProps {
  titleId?: string
}

const DashboardOverdueHeader = ({ titleId }: DashboardOverdueHeaderProps) => {
  return (
    <DashboardPanelHeader
      title={OVERDUE_CARD_LABEL}
      href={OVERDUE_QUEUE_HREF}
      linkLabel={OVERDUE_QUEUE_LINK_LABEL}
      titleId={titleId}
    />
  )
}

export default DashboardOverdueHeader
