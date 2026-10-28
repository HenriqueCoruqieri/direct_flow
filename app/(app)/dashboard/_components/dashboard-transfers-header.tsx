import {
  TRANSFERS_APPROVALS_LINK_LABEL,
  TRANSFERS_CARD_LABEL,
} from "@/app/_lib/domain/dashboard"
import { TRANSFERS_APPROVALS_HREF } from "@/app/_lib/validation/dashboard"

import DashboardPanelHeader from "./dashboard-panel-header"
import DashboardPanelLink from "./dashboard-panel-link"

interface DashboardTransfersHeaderProps {
  titleId?: string
}

const DashboardTransfersHeader = ({
  titleId,
}: DashboardTransfersHeaderProps) => {
  return (
    <DashboardPanelHeader title={TRANSFERS_CARD_LABEL} titleId={titleId}>
      <DashboardPanelLink
        href={TRANSFERS_APPROVALS_HREF}
        label={TRANSFERS_APPROVALS_LINK_LABEL}
      />
    </DashboardPanelHeader>
  )
}

export default DashboardTransfersHeader
