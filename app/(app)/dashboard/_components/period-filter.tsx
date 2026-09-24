import Link from "next/link"

import { PERIOD_LABELS, PRESET_PERIODS } from "@/app/_lib/domain/period"
import type { PeriodSelection } from "@/app/_lib/types/period"
import { serializeDashboardParams } from "@/app/_lib/validation/dashboard"

import CustomPeriodPicker from "./custom-period-picker"
import { periodPillVariants } from "./period-pill-variants"

interface PeriodFilterProps {
  selection: PeriodSelection
}

const PeriodFilter = ({ selection }: PeriodFilterProps) => {
  return (
    <nav aria-label="Período" className="flex flex-wrap gap-2">
      {PRESET_PERIODS.map((periodo) => {
        const active = selection.periodo === periodo

        return (
          <Link
            key={periodo}
            href={`/dashboard?${serializeDashboardParams({ periodo })}`}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={periodPillVariants({ active })}
          >
            {PERIOD_LABELS[periodo]}
          </Link>
        )
      })}
      <CustomPeriodPicker selection={selection} />
    </nav>
  )
}

export default PeriodFilter
