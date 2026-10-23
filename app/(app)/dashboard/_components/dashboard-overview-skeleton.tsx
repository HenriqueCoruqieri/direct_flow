import { Skeleton } from "@/app/_components/ui/skeleton"

const DashboardOverviewSkeleton = () => {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando indicadores"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      {[0, 1, 2, 3].map((index) => (
        <div
          key={index}
          className="flex flex-col gap-1.5 rounded-2xl border border-border-subtle bg-surface p-4"
        >
          <Skeleton className="h-4.5 w-3/4" />
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-5 w-1/2" />
        </div>
      ))}
    </div>
  )
}

export default DashboardOverviewSkeleton
