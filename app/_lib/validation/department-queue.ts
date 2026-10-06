import { z } from "zod"

import {
  DEFAULT_DEPARTMENT_QUEUE_PERIOD,
  DEFAULT_DEPARTMENT_QUEUE_TAB,
  DEPARTMENT_QUEUE_DEPARTMENT_PARAM,
  DEPARTMENT_QUEUE_PATH,
  DEPARTMENT_QUEUE_TABS,
} from "@/app/_lib/domain/department-queue"
import type {
  DepartmentQueueLocation,
  DepartmentQueueTab,
} from "@/app/_lib/types/department-queue"
import type { DateKey } from "@/app/_lib/types/period"
import {
  allTimePeriodSchema,
  periodFilterHref,
  readPeriodParams,
} from "@/app/_lib/validation/period"
import {
  firstSearchParam,
  idSearchParamSchema,
  type RawSearchParams,
} from "@/app/_lib/validation/search-params"

export const departmentQueueSearchParamsSchema = z.object({
  tab: z
    .enum(DEPARTMENT_QUEUE_TABS, { error: "Aba inválida." })
    .catch(DEFAULT_DEPARTMENT_QUEUE_TAB),
  [DEPARTMENT_QUEUE_DEPARTMENT_PARAM]: idSearchParamSchema("Setor inválido.")
    .optional()
    .catch(undefined),
})

export type DepartmentQueueSearchParams = z.infer<
  typeof departmentQueueSearchParamsSchema
>

export const departmentQueuePeriodSchema = allTimePeriodSchema

export type DepartmentQueuePeriodParams = z.infer<
  ReturnType<typeof departmentQueuePeriodSchema>
>

export const parseDepartmentQueueParams = (
  raw: RawSearchParams,
  today: DateKey,
): DepartmentQueueLocation => {
  const params = departmentQueueSearchParamsSchema.safeParse({
    tab: firstSearchParam(raw.tab),
    [DEPARTMENT_QUEUE_DEPARTMENT_PARAM]: firstSearchParam(
      raw[DEPARTMENT_QUEUE_DEPARTMENT_PARAM],
    ),
  })
  const period = departmentQueuePeriodSchema(today).safeParse(
    readPeriodParams(raw),
  )

  return {
    tab: params.success ? params.data.tab : DEFAULT_DEPARTMENT_QUEUE_TAB,
    period: period.success ? period.data : DEFAULT_DEPARTMENT_QUEUE_PERIOD,
    departmentId: params.success
      ? (params.data[DEPARTMENT_QUEUE_DEPARTMENT_PARAM] ?? null)
      : null,
  }
}

export const departmentQueueKeepParams = (
  tab: DepartmentQueueTab,
  departmentId: number | null,
): Readonly<Record<string, string>> =>
  departmentId === null
    ? { tab }
    : { tab, [DEPARTMENT_QUEUE_DEPARTMENT_PARAM]: String(departmentId) }

export const departmentQueueHref = ({
  tab,
  period,
  departmentId,
}: DepartmentQueueLocation): string =>
  periodFilterHref(
    DEPARTMENT_QUEUE_PATH,
    departmentQueueKeepParams(tab, departmentId),
    period,
  )
