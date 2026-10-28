import {
  findTransferSummary,
  listOldestIncomingTransfers,
} from "@/app/_lib/data/dashboard"
import {
  DASHBOARD_VIEW_MODES,
  INCOMING_TRANSFERS_LIMIT,
} from "@/app/_lib/domain/dashboard"
import type { DashboardIncomingTransfersByMode } from "@/app/_lib/types/dashboard"
import type { DateRange, PeriodSelection } from "@/app/_lib/types/period"

import DashboardPanel from "./dashboard-panel"
import DashboardTransfersContent from "./dashboard-transfers-content"
import DashboardTransfersHeader from "./dashboard-transfers-header"
import DashboardViewPane from "./dashboard-view-pane"

const TITLE_ID = "dashboard-transfers-title"

interface DashboardTransfersProps {
  departmentId: number
  userId: number
  range: DateRange
  now: Date
  selection: PeriodSelection
}

const DashboardTransfers = async ({
  departmentId,
  userId,
  range,
  now,
  selection,
}: DashboardTransfersProps) => {
  const [summaryByMode, coletivo, individual] = await Promise.all([
    findTransferSummary(departmentId, range, userId),
    listOldestIncomingTransfers(departmentId, INCOMING_TRANSFERS_LIMIT),
    listOldestIncomingTransfers(departmentId, INCOMING_TRANSFERS_LIMIT, userId),
  ])
  const transfersByMode: DashboardIncomingTransfersByMode = {
    coletivo,
    individual,
  }

  return (
    <DashboardPanel
      aria-labelledby={TITLE_ID}
      className="xl:col-span-2 xl:col-start-4"
    >
      <DashboardTransfersHeader titleId={TITLE_ID} />
      {DASHBOARD_VIEW_MODES.map((mode) => (
        <DashboardViewPane key={mode} mode={mode}>
          <DashboardTransfersContent
            summary={summaryByMode[mode]}
            transfers={transfersByMode[mode]}
            mode={mode}
            now={now}
            selection={selection}
          />
        </DashboardViewPane>
      ))}
    </DashboardPanel>
  )
}

export default DashboardTransfers
