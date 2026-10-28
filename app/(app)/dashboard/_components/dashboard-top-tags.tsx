import { listDashboardTopTags } from "@/app/_lib/data/dashboard"
import {
  DASHBOARD_VIEW_MODES,
  TOP_TAGS_CARD_LABEL,
  TOP_TAGS_LIMIT,
} from "@/app/_lib/domain/dashboard"
import type { DashboardTopTagsByMode } from "@/app/_lib/types/dashboard"
import type { DateRange } from "@/app/_lib/types/period"

import DashboardPanel from "./dashboard-panel"
import DashboardTopTagsContent from "./dashboard-top-tags-content"
import DashboardViewPane from "./dashboard-view-pane"

const TITLE_ID = "dashboard-top-tags-title"

interface DashboardTopTagsProps {
  departmentId: number
  userId: number
  range: DateRange
}

const DashboardTopTags = async ({
  departmentId,
  userId,
  range,
}: DashboardTopTagsProps) => {
  const [coletivo, individual] = await Promise.all([
    listDashboardTopTags(departmentId, range, TOP_TAGS_LIMIT),
    listDashboardTopTags(departmentId, range, TOP_TAGS_LIMIT, userId),
  ])
  const topTagsByMode: DashboardTopTagsByMode = { coletivo, individual }

  return (
    <DashboardPanel aria-labelledby={TITLE_ID} className="xl:col-span-3">
      <h2
        id={TITLE_ID}
        className="text-caption font-semibold text-muted-foreground"
      >
        {TOP_TAGS_CARD_LABEL}
      </h2>
      {DASHBOARD_VIEW_MODES.map((mode) => (
        <DashboardViewPane key={mode} mode={mode}>
          <DashboardTopTagsContent topTags={topTagsByMode[mode]} mode={mode} />
        </DashboardViewPane>
      ))}
    </DashboardPanel>
  )
}

export default DashboardTopTags
