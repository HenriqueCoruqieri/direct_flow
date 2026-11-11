import { Skeleton } from "@/app/_components/ui/skeleton"

const GoalGaugeCardSkeleton = () => {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border-subtle bg-surface p-4">
      <Skeleton className="h-4 w-28" />
      <div className="flex min-w-0 items-center gap-4 sm:flex-col sm:gap-3">
        <div className="flex shrink-0 flex-col gap-1">
          <Skeleton className="h-20 w-36 rounded-t-full" />
          <Skeleton className="h-3.5 w-36" />
        </div>
        <div className="flex min-w-0 flex-col items-start gap-1.5 sm:items-center">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
    </div>
  )
}

export default GoalGaugeCardSkeleton
