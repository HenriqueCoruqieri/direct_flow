import { findTeamProduction } from "@/app/_lib/data/department-goals"
import type { DateRange } from "@/app/_lib/types/period"

import ProductionPanel from "./production-panel"

interface ProductionSectionProps {
  departmentId: number
  sessionUserId: number
  range: DateRange
  filter: React.ReactNode
}

const ProductionSection = async ({
  departmentId,
  sessionUserId,
  range,
  filter,
}: ProductionSectionProps) => {
  const entries = await findTeamProduction(departmentId, range)

  return (
    <ProductionPanel
      entries={entries}
      sessionUserId={sessionUserId}
      filter={filter}
    />
  )
}

export default ProductionSection
