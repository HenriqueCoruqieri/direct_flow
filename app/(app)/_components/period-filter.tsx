import Link from "next/link"

import { PERIOD_LABELS } from "@/app/_lib/domain/period"
import type {
  PeriodFilterSelection,
  PresetPeriodOption,
} from "@/app/_lib/types/period"
import { periodFilterHref } from "@/app/_lib/validation/period"

import CustomPeriodPicker from "./custom-period-picker"
import { periodPillVariants } from "./period-pill-variants"

interface PeriodFilterProps {
  pathname: string
  keep?: Readonly<Record<string, string>>
  presets: readonly PresetPeriodOption[]
  selection: PeriodFilterSelection
}

const PeriodFilter = ({
  pathname,
  keep = {},
  presets,
  selection,
}: PeriodFilterProps) => {
  return (
    <nav aria-label="Período" className="flex flex-wrap gap-2">
      {presets.map((periodo) => {
        const active = selection.periodo === periodo

        return (
          <Link
            key={periodo}
            href={periodFilterHref(pathname, keep, { periodo })}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={periodPillVariants({ active })}
          >
            {PERIOD_LABELS[periodo]}
          </Link>
        )
      })}
      <CustomPeriodPicker
        pathname={pathname}
        keep={keep}
        selection={selection}
      />
    </nav>
  )
}

export default PeriodFilter
