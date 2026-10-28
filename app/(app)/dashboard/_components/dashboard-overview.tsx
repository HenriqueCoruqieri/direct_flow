import { findDashboardOverview } from "@/app/_lib/data/dashboard"
import { DASHBOARD_VIEW_MODES } from "@/app/_lib/domain/dashboard"
import type { DateRange } from "@/app/_lib/types/period"

import DashboardOverviewCards from "./dashboard-overview-cards"
import DashboardViewPane from "./dashboard-view-pane"

interface DashboardOverviewProps {
  departmentId: number
  userId: number
  range: DateRange
  now: Date
}

const DashboardOverview = async ({
  departmentId,
  userId,
  range,
  now,
}: DashboardOverviewProps) => {
  const overviews = await findDashboardOverview(
    departmentId,
    range,
    now,
    userId,
  )

  return (
    <>
      {DASHBOARD_VIEW_MODES.map((mode) => (
        <DashboardViewPane key={mode} mode={mode}>
          <DashboardOverviewCards overview={overviews[mode]} mode={mode} />
        </DashboardViewPane>
      ))}
    </>
  )
}

export default DashboardOverview
