import { z } from "zod"

import {
  DEFAULT_OPERATIONS_PERIOD,
  DEFAULT_OPERATIONS_TAB,
  OPERATIONS_DEPARTMENT_PARAM,
  OPERATIONS_PATH,
  OPERATIONS_TAB_PARAM,
  OPERATIONS_TABS,
} from "@/app/_lib/domain/operations"
import { PRESET_PERIODS } from "@/app/_lib/domain/period"
import type {
  OperationsLocation,
  OperationsTab,
} from "@/app/_lib/types/operations"
import type { DateKey } from "@/app/_lib/types/period"
import {
  customPeriodSchema,
  readPeriodParams,
  serializePeriodParams,
} from "@/app/_lib/validation/period"
import {
  firstSearchParam,
  idSearchParamSchema,
  type RawSearchParams,
} from "@/app/_lib/validation/search-params"

export const operationsSearchParamsSchema = z.object({
  [OPERATIONS_TAB_PARAM]: z
    .enum(OPERATIONS_TABS, { error: "Aba inválida." })
    .catch(DEFAULT_OPERATIONS_TAB),
  [OPERATIONS_DEPARTMENT_PARAM]: idSearchParamSchema("Setor inválido.")
    .optional()
    .catch(undefined),
})

export type OperationsSearchParams = z.infer<
  typeof operationsSearchParamsSchema
>

export const operationsPeriodSchema = (today: DateKey) =>
  z.discriminatedUnion("periodo", [
    z.object({ periodo: z.enum(PRESET_PERIODS) }),
    customPeriodSchema(today),
  ])

export type OperationsPeriodParams = z.infer<
  ReturnType<typeof operationsPeriodSchema>
>

export const parseOperationsParams = (
  raw: RawSearchParams,
  today: DateKey,
): OperationsLocation => {
  const params = operationsSearchParamsSchema.safeParse({
    [OPERATIONS_TAB_PARAM]: firstSearchParam(raw[OPERATIONS_TAB_PARAM]),
    [OPERATIONS_DEPARTMENT_PARAM]: firstSearchParam(
      raw[OPERATIONS_DEPARTMENT_PARAM],
    ),
  })
  const period = operationsPeriodSchema(today).safeParse(readPeriodParams(raw))

  return {
    tab: params.success
      ? params.data[OPERATIONS_TAB_PARAM]
      : DEFAULT_OPERATIONS_TAB,
    period: period.success ? period.data : DEFAULT_OPERATIONS_PERIOD,
    departmentId: params.success
      ? (params.data[OPERATIONS_DEPARTMENT_PARAM] ?? null)
      : null,
  }
}

export const operationsKeepParams = (
  tab: OperationsTab,
  departmentId: number | null,
): Readonly<Record<string, string>> =>
  departmentId === null
    ? { [OPERATIONS_TAB_PARAM]: tab }
    : {
        [OPERATIONS_TAB_PARAM]: tab,
        [OPERATIONS_DEPARTMENT_PARAM]: String(departmentId),
      }

export const serializeOperationsParams = ({
  tab,
  period,
  departmentId,
}: OperationsLocation): string => {
  const params = new URLSearchParams(operationsKeepParams(tab, departmentId))
  for (const [key, value] of new URLSearchParams(
    serializePeriodParams(period),
  )) {
    params.set(key, value)
  }
  return params.toString()
}

export const operationsHref = (location: OperationsLocation): string =>
  `${OPERATIONS_PATH}?${serializeOperationsParams(location)}`

export const operationsTabHref = (
  location: OperationsLocation,
  tab: OperationsTab,
): string => operationsHref({ ...location, tab })

const OPERATIONS_PARAM_KEYS = [
  OPERATIONS_TAB_PARAM,
  "periodo",
  "de",
  "ate",
  OPERATIONS_DEPARTMENT_PARAM,
] as const

export const operationsCanonicalHref = (
  raw: RawSearchParams,
  location: OperationsLocation,
): string | null => {
  const canonical = new URLSearchParams(serializeOperationsParams(location))
  const isCanonical = OPERATIONS_PARAM_KEYS.every(
    (key) => raw[key] === (canonical.get(key) ?? undefined),
  )
  return isCanonical ? null : operationsHref(location)
}
