import { Skeleton } from "@/app/_components/ui/skeleton"
import {
  DUE_HOURS_FIELDS,
  DUE_HOURS_PAGE_TITLE,
} from "@/app/_lib/domain/department-due-hours"

const DueHoursLoading = () => {
  return (
    <div className="flex flex-col gap-5.5 px-5 pt-5 pb-8 lg:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-title font-semibold">
          {DUE_HOURS_PAGE_TITLE}
        </h1>
        <Skeleton className="h-4.5 w-96 max-w-full" />
      </div>
      <div className="flex max-w-3xl flex-col rounded-2xl border border-border-subtle bg-surface">
        <div className="flex flex-col gap-3 border-b border-border-subtle px-6 pt-5 pb-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="grid gap-5 px-6 py-5 sm:grid-cols-2">
          {DUE_HOURS_FIELDS.map((name) => (
            <div key={name} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-border-subtle px-6 py-4">
          <Skeleton className="h-4 w-80 max-w-full" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
    </div>
  )
}

export default DueHoursLoading
