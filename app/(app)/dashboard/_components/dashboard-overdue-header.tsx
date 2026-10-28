import {
  DASHBOARD_VIEW_MODES,
  OVERDUE_CARD_LABEL,
  OVERDUE_QUEUE_LINK_LABEL,
} from "@/app/_lib/domain/dashboard"
import { OVERDUE_QUEUE_HREFS } from "@/app/_lib/validation/dashboard"

import DashboardPanelHeader from "./dashboard-panel-header"
import DashboardPanelLink from "./dashboard-panel-link"
import DashboardViewPane from "./dashboard-view-pane"

interface DashboardOverdueHeaderProps {
  titleId?: string
}

const DashboardOverdueHeader = ({ titleId }: DashboardOverdueHeaderProps) => {
  return (
    <DashboardPanelHeader title={OVERDUE_CARD_LABEL} titleId={titleId}>
      {DASHBOARD_VIEW_MODES.map((mode) => (
        <DashboardViewPane key={mode} mode={mode}>
          <DashboardPanelLink
            href={OVERDUE_QUEUE_HREFS[mode]}
            label={OVERDUE_QUEUE_LINK_LABEL}
          />
        </DashboardViewPane>
      ))}
    </DashboardPanelHeader>
  )
}

export default DashboardOverdueHeader
