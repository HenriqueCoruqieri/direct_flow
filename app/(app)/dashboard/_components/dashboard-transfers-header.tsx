import {
  TRANSFERS_APPROVALS_LINK_LABEL,
  TRANSFERS_CARD_LABEL,
} from "@/app/_lib/domain/dashboard"
import { TRANSFERS_APPROVALS_HREF } from "@/app/_lib/validation/dashboard"

import DashboardPanelHeader from "./dashboard-panel-header"

interface DashboardTransfersHeaderProps {
  titleId?: string
}

const DashboardTransfersHeader = ({
  titleId,
}: DashboardTransfersHeaderProps) => {
  return (
    <DashboardPanelHeader
      title={TRANSFERS_CARD_LABEL}
      href={TRANSFERS_APPROVALS_HREF}
      linkLabel={TRANSFERS_APPROVALS_LINK_LABEL}
      titleId={titleId}
    />
  )
}

export default DashboardTransfersHeader
