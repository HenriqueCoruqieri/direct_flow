import { Skeleton } from "@/app/_components/ui/skeleton"
import { OPERATIONS_LABEL } from "@/app/_lib/domain/operations"

import AppTopBarFrame from "../_components/app-top-bar-frame"
import GoalPanelSkeleton from "./_components/goal-panel-skeleton"

const OperationsLoading = () => {
  return (
    <>
      <AppTopBarFrame action={<Skeleton className="h-9 w-32 rounded-full" />} />
      <div className="flex flex-col gap-5.5 px-5 pt-5 pb-8 lg:px-6">
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-title font-semibold">
              {OPERATIONS_LABEL}
            </h1>
            <Skeleton className="h-4.5 w-72 max-w-full" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Skeleton className="h-5 w-80 max-w-full" />
            <Skeleton className="h-8 w-64 rounded-full" />
          </div>
        </div>
        <GoalPanelSkeleton scope="person" />
      </div>
    </>
  )
}

export default OperationsLoading
