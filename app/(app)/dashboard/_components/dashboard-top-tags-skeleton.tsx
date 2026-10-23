import { Skeleton } from "@/app/_components/ui/skeleton"
import { TOP_TAGS_LIMIT } from "@/app/_lib/domain/dashboard"

import DashboardPanel from "./dashboard-panel"

const DashboardTopTagsSkeleton = () => {
  return (
    <DashboardPanel
      aria-busy="true"
      aria-label="Carregando principal ofensor"
      className="xl:col-span-3"
    >
      <Skeleton className="h-4.5 w-1/4" />
      <Skeleton className="mt-1.5 h-7 w-1/2" />
      <Skeleton className="mt-1.5 h-4 w-1/3" />
      <div className="mt-4 flex flex-col gap-2.5">
        {Array.from({ length: TOP_TAGS_LIMIT }, (_, index) => (
          <div key={index} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-5 w-2/5" />
              <Skeleton className="h-5 w-6" />
            </div>
            <Skeleton className="h-1 w-full" />
          </div>
        ))}
      </div>
    </DashboardPanel>
  )
}

export default DashboardTopTagsSkeleton
