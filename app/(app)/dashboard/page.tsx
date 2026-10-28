import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"

import { requireSession } from "@/app/_lib/auth/session"
import { formatRangeLabel, resolvePeriodRange, todayKey } from "@/app/_lib/date"
import { PRESET_PERIODS } from "@/app/_lib/domain/period"
import {
  dashboardCanonicalHref,
  parseDashboardParams,
  serializeDashboardParams,
} from "@/app/_lib/validation/dashboard"

import AppTopBar from "../_components/app-top-bar"
import PeriodFilter from "../_components/period-filter"
import DashboardActivity from "./_components/dashboard-activity"
import DashboardActivitySkeleton from "./_components/dashboard-activity-skeleton"
import DashboardOverdue from "./_components/dashboard-overdue"
import DashboardOverdueSkeleton from "./_components/dashboard-overdue-skeleton"
import DashboardOverview from "./_components/dashboard-overview"
import DashboardOverviewSkeleton from "./_components/dashboard-overview-skeleton"
import DashboardTopTags from "./_components/dashboard-top-tags"
import DashboardTopTagsSkeleton from "./_components/dashboard-top-tags-skeleton"
import DashboardTransfers from "./_components/dashboard-transfers"
import DashboardTransfersSkeleton from "./_components/dashboard-transfers-skeleton"
import DashboardViewModeProvider from "./_components/dashboard-view-mode-provider"
import DashboardViewModeSwitch from "./_components/dashboard-view-mode-switch"

export const metadata: Metadata = {
  title: "Início",
}

const DashboardPage = async ({ searchParams }: PageProps<"/dashboard">) => {
  const actor = await requireSession()
  const now = new Date()
  const raw = await searchParams
  const selection = parseDashboardParams(raw, todayKey(now))
  const canonicalHref = dashboardCanonicalHref(raw, selection)
  if (canonicalHref !== null) {
    redirect(canonicalHref)
  }
  const range = resolvePeriodRange(selection, now)

  return (
    <>
      <AppTopBar />
      <DashboardViewModeProvider>
        <div className="flex flex-col gap-5.5 px-5 pt-5 pb-8 lg:px-6">
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="font-heading text-title font-semibold">Início</h1>
              <p className="text-caption text-muted-foreground">
                {formatRangeLabel(range)}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <PeriodFilter
                pathname="/dashboard"
                presets={PRESET_PERIODS}
                selection={selection}
              />
              <DashboardViewModeSwitch />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Suspense
              key={serializeDashboardParams(selection)}
              fallback={<DashboardOverviewSkeleton />}
            >
              <DashboardOverview
                departmentId={actor.departmentId}
                userId={actor.id}
                range={range}
                now={now}
              />
            </Suspense>
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-5">
              <Suspense
                key={serializeDashboardParams(selection)}
                fallback={<DashboardTopTagsSkeleton />}
              >
                <DashboardTopTags
                  departmentId={actor.departmentId}
                  userId={actor.id}
                  range={range}
                />
              </Suspense>
              <Suspense fallback={<DashboardOverdueSkeleton />}>
                <DashboardOverdue
                  departmentId={actor.departmentId}
                  userId={actor.id}
                  now={now}
                  selection={selection}
                />
              </Suspense>
            </div>
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-5">
              <Suspense
                key={serializeDashboardParams(selection)}
                fallback={<DashboardActivitySkeleton range={range} />}
              >
                <DashboardActivity
                  departmentId={actor.departmentId}
                  userId={actor.id}
                  range={range}
                  now={now}
                />
              </Suspense>
              <Suspense fallback={<DashboardTransfersSkeleton />}>
                <DashboardTransfers
                  departmentId={actor.departmentId}
                  range={range}
                  now={now}
                  selection={selection}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </DashboardViewModeProvider>
    </>
  )
}

export default DashboardPage
