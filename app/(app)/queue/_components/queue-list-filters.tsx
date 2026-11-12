import DepartmentFilter from "@/app/_components/department-filter"
import {
  DEPARTMENT_QUEUE_DEPARTMENT_FILTER_LABEL,
  DEPARTMENT_QUEUE_PATH,
  DEPARTMENT_QUEUE_PERIOD_PRESETS,
  queueDepartmentParamFor,
} from "@/app/_lib/domain/department-queue"
import type { DepartmentOption } from "@/app/_lib/types/department"
import type { DepartmentQueueLocation } from "@/app/_lib/types/department-queue"
import type { TicketActorFacts } from "@/app/_lib/types/ticket"
import {
  departmentQueueHref,
  departmentQueueKeepParams,
} from "@/app/_lib/validation/department-queue"

import PeriodFilter from "../../_components/period-filter"

interface QueueListFiltersProps {
  viewer: TicketActorFacts
  location: DepartmentQueueLocation
  departmentOptions: DepartmentOption[]
  departmentId: number
}

const QueueListFilters = ({
  viewer,
  location,
  departmentOptions,
  departmentId,
}: QueueListFiltersProps) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <PeriodFilter
        pathname={DEPARTMENT_QUEUE_PATH}
        keep={departmentQueueKeepParams(location.tab, location.departmentId)}
        presets={DEPARTMENT_QUEUE_PERIOD_PRESETS}
        selection={location.period}
      />
      {departmentOptions.length > 0 ? (
        <DepartmentFilter
          label={DEPARTMENT_QUEUE_DEPARTMENT_FILTER_LABEL}
          options={departmentOptions.map((option) => ({
            id: option.id,
            name: option.name,
            href: departmentQueueHref({
              ...location,
              departmentId: queueDepartmentParamFor(viewer, option.id),
            }),
          }))}
          value={departmentId}
        />
      ) : null}
    </div>
  )
}

export default QueueListFilters
