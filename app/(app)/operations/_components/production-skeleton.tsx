import { Skeleton } from "@/app/_components/ui/skeleton"
import { PRODUCTION_LOADING_LABEL } from "@/app/_lib/domain/operations"
import { cn } from "@/app/_lib/utils"

import ProductionPanelFrame from "./production-panel-frame"

const BAR_HEIGHTS = ["h-48", "h-40", "h-32", "h-28", "h-20", "h-12"]

interface ProductionSkeletonProps {
  filter?: React.ReactNode
}

const ProductionSkeleton = ({ filter = null }: ProductionSkeletonProps) => {
  return (
    <ProductionPanelFrame
      aria-busy="true"
      aria-label={PRODUCTION_LOADING_LABEL}
      subtitle={<Skeleton className="h-4 w-64 max-w-full" />}
      filter={filter}
    >
      <div className="flex h-72 items-end justify-around gap-6 overflow-hidden">
        {BAR_HEIGHTS.map((height) => (
          <div key={height} className="flex flex-col items-center gap-2">
            <Skeleton className="size-8.5 rounded-full" />
            <Skeleton className={cn("w-10 rounded-b-none", height)} />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
    </ProductionPanelFrame>
  )
}

export default ProductionSkeleton
