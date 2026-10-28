import { listOverdueTickets } from "@/app/_lib/data/dashboard"
import {
  DASHBOARD_VIEW_MODES,
  OVERDUE_TICKETS_LIMIT,
} from "@/app/_lib/domain/dashboard"
import type { DashboardOverdueByMode } from "@/app/_lib/types/dashboard"
import type { PeriodSelection } from "@/app/_lib/types/period"

import DashboardOverdueContent from "./dashboard-overdue-content"
import DashboardOverdueHeader from "./dashboard-overdue-header"
import DashboardPanel from "./dashboard-panel"
import DashboardViewPane from "./dashboard-view-pane"

const TITLE_ID = "dashboard-overdue-title"

interface DashboardOverdueProps {
  departmentId: number
  userId: number
  now: Date
  selection: PeriodSelection
}

const DashboardOverdue = async ({
  departmentId,
  userId,
  now,
  selection,
}: DashboardOverdueProps) => {
  const [coletivo, individual] = await Promise.all([
    listOverdueTickets(departmentId, now, OVERDUE_TICKETS_LIMIT),
    listOverdueTickets(departmentId, now, OVERDUE_TICKETS_LIMIT, userId),
  ])
  const overdueByMode: DashboardOverdueByMode = { coletivo, individual }

  return (
    <DashboardPanel aria-labelledby={TITLE_ID} className="xl:col-span-2">
      <DashboardOverdueHeader titleId={TITLE_ID} />
      {DASHBOARD_VIEW_MODES.map((mode) => (
        <DashboardViewPane key={mode} mode={mode}>
          <DashboardOverdueContent
            tickets={overdueByMode[mode]}
            mode={mode}
            now={now}
            selection={selection}
          />
        </DashboardViewPane>
      ))}
    </DashboardPanel>
  )
}

export default DashboardOverdue
