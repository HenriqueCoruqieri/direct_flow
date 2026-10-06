import { z } from "zod"

import {
  isActiveFromPeopleStatusParam,
  NO_PEOPLE_FILTERS,
  PEOPLE_DEPARTMENT_PARAM,
  PEOPLE_STATUS_PARAM,
  PEOPLE_STATUS_PARAMS,
} from "@/app/_lib/domain/people-filters"
import type { PeopleFilters } from "@/app/_lib/types/person"
import {
  firstSearchParam,
  idSearchParamSchema,
  type RawSearchParams,
} from "@/app/_lib/validation/search-params"

export const peopleFiltersSchema = z.object({
  [PEOPLE_DEPARTMENT_PARAM]: idSearchParamSchema("Setor inválido.")
    .optional()
    .catch(undefined),
  [PEOPLE_STATUS_PARAM]: z
    .enum(PEOPLE_STATUS_PARAMS, { error: "Status inválido." })
    .optional()
    .catch(undefined),
})

export type PeopleFiltersParams = z.infer<typeof peopleFiltersSchema>

export const parsePeopleFilters = (raw: RawSearchParams): PeopleFilters => {
  const result = peopleFiltersSchema.safeParse({
    [PEOPLE_DEPARTMENT_PARAM]: firstSearchParam(raw[PEOPLE_DEPARTMENT_PARAM]),
    [PEOPLE_STATUS_PARAM]: firstSearchParam(raw[PEOPLE_STATUS_PARAM]),
  })
  if (!result.success) return NO_PEOPLE_FILTERS

  const departmentId = result.data[PEOPLE_DEPARTMENT_PARAM]
  const status = result.data[PEOPLE_STATUS_PARAM]

  return {
    departmentId: departmentId ?? null,
    isActive:
      status === undefined ? null : isActiveFromPeopleStatusParam(status),
  }
}
