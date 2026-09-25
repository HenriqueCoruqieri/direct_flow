import { findDashboardSummary } from "@/app/_lib/data/dashboard"
import type { DateRange } from "@/app/_lib/types/period"

import StatCard from "./stat-card"

interface DashboardStatsProps {
  departmentId: number
  range: DateRange
}

const tagValueSize = (name: string): string | undefined => {
  if (name.length <= 6) return undefined
  if (name.length <= 12) return "text-xl leading-none sm:text-display"
  return "text-base leading-none sm:text-2xl"
}

const ticketCountLabel = (count: number): string =>
  `${count} ${count === 1 ? "chamado" : "chamados"}`

const DashboardStats = async ({ departmentId, range }: DashboardStatsProps) => {
  const summary = await findDashboardSummary(departmentId, range)
  const { topTag } = summary

  return (
    <div className="grid grid-cols-2 gap-3 lg:max-w-3xl">
      <StatCard label="Chamados no período" value={summary.ticketCount} />
      <StatCard
        label="Principal tag ofensora"
        value={topTag ? topTag.name : "—"}
        valueTitle={topTag?.name}
        valueClassName={topTag ? tagValueSize(topTag.name) : undefined}
        hint={
          topTag ? ticketCountLabel(topTag.count) : "Nenhuma tag no período"
        }
      />
    </div>
  )
}

export default DashboardStats
