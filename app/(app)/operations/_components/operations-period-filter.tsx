import {
  OPERATIONS_PATH,
  OPERATIONS_PERIOD_PRESETS,
} from "@/app/_lib/domain/operations"
import type { OperationsLocation } from "@/app/_lib/types/operations"
import { operationsKeepParams } from "@/app/_lib/validation/operations"

import PeriodFilter from "../../_components/period-filter"

interface OperationsPeriodFilterProps {
  location: OperationsLocation
}

const OperationsPeriodFilter = ({ location }: OperationsPeriodFilterProps) => {
  return (
    <PeriodFilter
      pathname={OPERATIONS_PATH}
      keep={operationsKeepParams(location.tab, location.departmentId)}
      presets={OPERATIONS_PERIOD_PRESETS}
      selection={location.period}
    />
  )
}

export default OperationsPeriodFilter
