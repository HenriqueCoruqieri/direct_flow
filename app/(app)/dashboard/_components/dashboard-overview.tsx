import { findDashboardOverview } from "@/app/_lib/data/dashboard"
import {
  backlogHoursHint,
  DASHBOARD_OVERVIEW_LABELS,
  EMPTY_BACKLOG_HINT,
  firstResponseHint,
  formatResolutionRate,
  NO_RESOLUTIONS_IN_PERIOD_HINT,
  NO_TICKETS_IN_PERIOD_HINT,
  receivedTransfersHint,
  resolutionRatePercent,
} from "@/app/_lib/domain/dashboard"
import { EMPTY_VALUE_LABEL } from "@/app/_lib/domain/labels"
import type { DateRange } from "@/app/_lib/types/period"

import DurationValue from "./duration-value"
import ResolutionProgress from "./resolution-progress"
import StatCard from "./stat-card"
import StatHint from "./stat-hint"

interface DashboardOverviewProps {
  departmentId: number
  range: DateRange
}

const DashboardOverview = async ({
  departmentId,
  range,
}: DashboardOverviewProps) => {
  const overview = await findDashboardOverview(departmentId, range)
  const ratePercent = resolutionRatePercent(
    overview.resolvedTicketCount,
    overview.ticketCount,
  )
  const averageResolutionMs = overview.averageResolutionMs

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label={DASHBOARD_OVERVIEW_LABELS.ticketCount}
        value={overview.ticketCount}
        footer={
          <StatHint
            text={receivedTransfersHint(overview.receivedTransferCount)}
          />
        }
      />
      <StatCard
        label={DASHBOARD_OVERVIEW_LABELS.resolutionRate}
        value={
          ratePercent === null
            ? EMPTY_VALUE_LABEL
            : formatResolutionRate(ratePercent)
        }
        footer={
          ratePercent === null ? (
            <StatHint text={NO_TICKETS_IN_PERIOD_HINT} />
          ) : (
            <ResolutionProgress
              percent={ratePercent}
              label={DASHBOARD_OVERVIEW_LABELS.resolutionRate}
              valueText={formatResolutionRate(ratePercent)}
            />
          )
        }
      />
      <StatCard
        label={DASHBOARD_OVERVIEW_LABELS.averageResolution}
        value={
          averageResolutionMs === null ? (
            EMPTY_VALUE_LABEL
          ) : (
            <DurationValue durationMs={averageResolutionMs} />
          )
        }
        footer={
          averageResolutionMs === null ? (
            <StatHint text={NO_RESOLUTIONS_IN_PERIOD_HINT} />
          ) : (
            <StatHint text={firstResponseHint()} illustrative />
          )
        }
      />
      <StatCard
        label={DASHBOARD_OVERVIEW_LABELS.backlog}
        value={overview.backlogCount}
        footer={
          overview.backlogCount > 0 ? (
            <StatHint
              text={backlogHoursHint(overview.backlogCount)}
              illustrative
            />
          ) : (
            <StatHint text={EMPTY_BACKLOG_HINT} />
          )
        }
      />
    </div>
  )
}

export default DashboardOverview
