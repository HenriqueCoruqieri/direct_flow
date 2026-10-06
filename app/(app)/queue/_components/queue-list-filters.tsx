import {
  DEPARTMENT_QUEUE_PATH,
  DEPARTMENT_QUEUE_PERIOD_PRESETS,
} from "@/app/_lib/domain/department-queue"
import type { DepartmentOption } from "@/app/_lib/types/department"
import type { DepartmentQueueLocation } from "@/app/_lib/types/department-queue"
import type { TicketActorFacts } from "@/app/_lib/types/ticket"
import { departmentQueueKeepParams } from "@/app/_lib/validation/department-queue"

import PeriodFilter from "../../_components/period-filter"
import QueueDepartmentFilter from "./queue-department-filter"

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
        <QueueDepartmentFilter
          viewer={viewer}
          location={location}
          options={departmentOptions}
          value={departmentId}
        />
      ) : null}
    </div>
  )
}

export default QueueListFilters
