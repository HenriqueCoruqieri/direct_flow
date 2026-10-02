import { z } from "zod"

import { DEFAULT_PERIOD, PRESET_PERIODS } from "@/app/_lib/domain/period"
import type { PeriodSelection } from "@/app/_lib/types/period"
import {
  customPeriodSchema,
  readPeriodParams,
  serializePeriodParams,
} from "@/app/_lib/validation/period"
import type { RawSearchParams } from "@/app/_lib/validation/search-params"

export const dashboardSearchParamsSchema = z.discriminatedUnion("periodo", [
  z.object({ periodo: z.enum(PRESET_PERIODS) }),
  customPeriodSchema,
])

export type DashboardSearchParams = z.infer<typeof dashboardSearchParamsSchema>

export const parseDashboardParams = (raw: RawSearchParams): PeriodSelection => {
  const result = dashboardSearchParamsSchema.safeParse(readPeriodParams(raw))
  return result.success ? result.data : { periodo: DEFAULT_PERIOD }
}

export const serializeDashboardParams = (selection: PeriodSelection): string =>
  serializePeriodParams(selection)
