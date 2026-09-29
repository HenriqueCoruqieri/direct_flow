import type { DataTableFilter } from "@/app/_components/data-table/data-table-filters"
import { describeActiveStatus } from "@/app/_lib/domain/status"

const activeStatusFilter: DataTableFilter = {
  columnId: "isActive",
  label: "Status",
  options: [true, false].map((isActive) => ({
    value: String(isActive),
    label: describeActiveStatus(isActive),
  })),
}

export default activeStatusFilter
