import { z } from "zod"

import { isDateKey } from "@/app/_lib/date"
import type { PeriodFilterSelection } from "@/app/_lib/types/period"
import {
  firstSearchParam,
  type RawSearchParams,
} from "@/app/_lib/validation/search-params"

const dateKeyField = z
  .string({ error: "Informe a data." })
  .refine(isDateKey, { error: "Data inválida." })

export const customPeriodSchema = z
  .object({
    periodo: z.literal("personalizado"),
    de: dateKeyField,
    ate: dateKeyField,
  })
  .refine((data) => data.ate >= data.de, {
    error: "A data final precisa ser igual ou posterior à inicial.",
    path: ["ate"],
  })

export interface RawPeriodParams {
  periodo: string | undefined
  de: string | undefined
  ate: string | undefined
}

export const readPeriodParams = (raw: RawSearchParams): RawPeriodParams => ({
  periodo: firstSearchParam(raw.periodo),
  de: firstSearchParam(raw.de),
  ate: firstSearchParam(raw.ate),
})

export const serializePeriodParams = (
  selection: PeriodFilterSelection,
): string => {
  const params = new URLSearchParams()
  params.set("periodo", selection.periodo)
  if (selection.periodo === "personalizado") {
    params.set("de", selection.de)
    params.set("ate", selection.ate)
  }
  return params.toString()
}

export const periodFilterHref = (
  pathname: string,
  keep: Readonly<Record<string, string>>,
  selection: PeriodFilterSelection,
): string => {
  const params = new URLSearchParams(keep)
  for (const [key, value] of new URLSearchParams(
    serializePeriodParams(selection),
  )) {
    params.set(key, value)
  }
  const query = params.toString()
  return query === "" ? pathname : `${pathname}?${query}`
}
