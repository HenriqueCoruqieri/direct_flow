import { Skeleton } from "@/app/_components/ui/skeleton"
import { INCOMING_TRANSFERS_LIMIT } from "@/app/_lib/domain/dashboard"

import DashboardPanel from "./dashboard-panel"
import DashboardTransfersHeader from "./dashboard-transfers-header"

const COUNTER_COUNT = 3

const DashboardTransfersSkeleton = () => {
  return (
    <DashboardPanel
      aria-busy="true"
      aria-label="Carregando transferências entre setores"
      className="xl:col-span-2 xl:col-start-4"
    >
      <DashboardTransfersHeader />
      <div className="mt-3 grid grid-cols-3 gap-2">
        {Array.from({ length: COUNTER_COUNT }, (_, index) => (
          <div
            key={index}
            className="flex flex-col gap-1 rounded-xl border border-transparent bg-surface-muted p-3"
          >
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="mt-4 h-6 w-8" />
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-col">
        {Array.from({ length: INCOMING_TRANSFERS_LIMIT }, (_, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-3 border-b border-border-subtle py-2.5 last:border-0"
          >
            <Skeleton className="h-5 w-2/5" />
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    </DashboardPanel>
  )
}

export default DashboardTransfersSkeleton
