import { Skeleton } from "@/app/_components/ui/skeleton"
import { OVERDUE_TICKETS_LIMIT } from "@/app/_lib/domain/dashboard"

import DashboardOverdueHeader from "./dashboard-overdue-header"
import DashboardPanel from "./dashboard-panel"

const DashboardOverdueSkeleton = () => {
  return (
    <DashboardPanel
      aria-busy="true"
      aria-label="Carregando maiores atrasos"
      className="xl:col-span-2"
    >
      <DashboardOverdueHeader />
      <div className="mt-3 flex h-10 items-center border-b border-border-subtle">
        <Skeleton className="h-4 w-1/2" />
      </div>
      {Array.from({ length: OVERDUE_TICKETS_LIMIT }, (_, index) => (
        <div
          key={index}
          className="flex items-center border-b border-border-subtle py-3 last:border-0"
        >
          <Skeleton className="h-5 w-full" />
        </div>
      ))}
    </DashboardPanel>
  )
}

export default DashboardOverdueSkeleton
