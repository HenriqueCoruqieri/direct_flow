import { z } from "zod"

import { isDateKey } from "@/app/_lib/date"
import { DEFAULT_PERIOD, PRESET_PERIODS } from "@/app/_lib/domain/period"
import type { PeriodSelection } from "@/app/_lib/types/period"

export type RawSearchParams = Record<string, string | string[] | undefined>

const dateKeyField = z
  .string({ error: "Informe a data." })
  .refine(isDateKey, { error: "Data inválida." })

export const dashboardSearchParamsSchema = z.discriminatedUnion("periodo", [
  z.object({ periodo: z.enum(PRESET_PERIODS) }),
  z
    .object({
      periodo: z.literal("personalizado"),
      de: dateKeyField,
      ate: dateKeyField,
    })
    .refine((data) => data.ate >= data.de, {
      error: "A data final precisa ser igual ou posterior à inicial.",
      path: ["ate"],
    }),
])

export type DashboardSearchParams = z.infer<typeof dashboardSearchParamsSchema>

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

export const parseDashboardParams = (raw: RawSearchParams): PeriodSelection => {
  const result = dashboardSearchParamsSchema.safeParse({
    periodo: firstValue(raw.periodo),
    de: firstValue(raw.de),
    ate: firstValue(raw.ate),
  })
  return result.success ? result.data : { periodo: DEFAULT_PERIOD }
}

export const serializeDashboardParams = (
  selection: PeriodSelection,
): string => {
  const params = new URLSearchParams({ periodo: selection.periodo })
  if (selection.periodo === "personalizado") {
    params.set("de", selection.de)
    params.set("ate", selection.ate)
  }
  return params.toString()
}
