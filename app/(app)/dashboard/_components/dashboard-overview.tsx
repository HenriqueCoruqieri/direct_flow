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
  resolutionRateFor,
  resolvedOfReceivedHint,
  resolvedWithoutReceivedHint,
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
  const rate = resolutionRateFor(overview)
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
          rate.kind === "measured"
            ? formatResolutionRate(rate.percent)
            : EMPTY_VALUE_LABEL
        }
        footer={
          rate.kind === "measured" ? (
            <div className="flex w-full min-w-0 flex-col">
              <ResolutionProgress
                percent={rate.percent}
                barPercent={rate.barPercent}
                label={DASHBOARD_OVERVIEW_LABELS.resolutionRate}
              />
              <StatHint
                text={resolvedOfReceivedHint(
                  rate.resolvedCount,
                  rate.receivedCount,
                )}
              />
            </div>
          ) : (
            <StatHint
              text={
                rate.kind === "unreceived"
                  ? resolvedWithoutReceivedHint(rate.resolvedCount)
                  : NO_TICKETS_IN_PERIOD_HINT
              }
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
