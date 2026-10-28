import {
  backlogHint,
  backlogValueLabel,
  DASHBOARD_OVERVIEW_EMPTY_HINTS,
  DASHBOARD_OVERVIEW_LABELS,
  firstResponseHint,
  formatResolutionRate,
  receivedTransfersHint,
  resolutionRateFor,
  resolvedOfReceivedHint,
  resolvedWithoutReceivedHint,
} from "@/app/_lib/domain/dashboard"
import { EMPTY_VALUE_LABEL } from "@/app/_lib/domain/labels"
import type {
  DashboardOverview,
  DashboardViewMode,
} from "@/app/_lib/types/dashboard"

import DurationValue from "./duration-value"
import ResolutionProgress from "./resolution-progress"
import StatCard from "./stat-card"
import StatHint from "./stat-hint"

interface DashboardOverviewCardsProps {
  overview: DashboardOverview
  mode: DashboardViewMode
}

const DashboardOverviewCards = ({
  overview,
  mode,
}: DashboardOverviewCardsProps) => {
  const rate = resolutionRateFor(overview)
  const averageResolutionMs = overview.averageResolutionMs
  const emptyHints = DASHBOARD_OVERVIEW_EMPTY_HINTS[mode]

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label={DASHBOARD_OVERVIEW_LABELS.ticketCount}
        value={overview.ticketCount}
        footer={
          <StatHint
            text={receivedTransfersHint(overview.receivedTransferCount, mode)}
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
                  : emptyHints.noTickets
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
            <StatHint text={emptyHints.noResolutions} />
          ) : (
            <StatHint text={firstResponseHint()} illustrative />
          )
        }
      />
      <StatCard
        label={DASHBOARD_OVERVIEW_LABELS.backlog}
        value={backlogValueLabel(overview)}
        footer={<StatHint text={backlogHint(overview, mode)} />}
      />
    </div>
  )
}

export default DashboardOverviewCards
