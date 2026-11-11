import {
  OPERATIONS_LABEL,
  operationsTabContext,
} from "@/app/_lib/domain/operations"
import type { OperationsLocation } from "@/app/_lib/types/operations"

import OperationsTabs from "./operations-tabs"

interface OperationsHeaderProps {
  location: OperationsLocation
  now: Date
  subtitle?: string | null
  actions?: React.ReactNode
}

const OperationsHeader = ({
  location,
  now,
  subtitle = null,
  actions = null,
}: OperationsHeaderProps) => {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="font-heading text-title font-semibold">
            {OPERATIONS_LABEL}
          </h1>
          {subtitle !== null ? (
            <p className="text-caption text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {actions !== null ? (
          <div className="flex flex-wrap items-center gap-2.5">{actions}</div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">
          {operationsTabContext(location.tab, now)}
        </p>
        <OperationsTabs location={location} />
      </div>
    </div>
  )
}

export default OperationsHeader
