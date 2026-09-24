import type { Metadata } from "next"
import { Suspense } from "react"

import { requireSession } from "@/app/_lib/auth/session"
import { formatRangeLabel, resolvePeriodRange } from "@/app/_lib/date"
import {
  parseDashboardParams,
  serializeDashboardParams,
} from "@/app/_lib/validation/dashboard"

import DashboardStats from "./_components/dashboard-stats"
import DashboardStatsSkeleton from "./_components/dashboard-stats-skeleton"
import PeriodFilter from "./_components/period-filter"

export const metadata: Metadata = {
  title: "Início",
}

const DashboardPage = async ({ searchParams }: PageProps<"/dashboard">) => {
  const actor = await requireSession()
  const selection = parseDashboardParams(await searchParams)
  const range = resolvePeriodRange(selection)

  return (
    <div className="flex flex-col gap-5.5 px-5 pt-5 pb-8 lg:px-6">
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="font-heading text-title font-semibold">Início</h1>
          <p className="text-caption text-muted-foreground">
            {formatRangeLabel(range)}
          </p>
        </div>
        <PeriodFilter selection={selection} />
      </div>

      <Suspense
        key={serializeDashboardParams(selection)}
        fallback={<DashboardStatsSkeleton />}
      >
        <DashboardStats departmentId={actor.departmentId} range={range} />
      </Suspense>
    </div>
  )
}

export default DashboardPage
