import { PEOPLE_REGISTRY_PATH } from "@/app/_lib/domain/registry"
import type { DepartmentOption } from "@/app/_lib/types/department"
import type { PeopleFilters, PeopleStatusParam } from "@/app/_lib/types/person"
import type { GrantedRegistryAccess } from "@/app/_lib/types/registry"

export const PEOPLE_DEPARTMENT_PARAM = "setor"

export const PEOPLE_STATUS_PARAM = "status"

export const PEOPLE_STATUS_PARAMS = [
  "ativo",
  "inativo",
] as const satisfies readonly PeopleStatusParam[]

export const NO_PEOPLE_FILTERS: PeopleFilters = {
  departmentId: null,
  isActive: null,
}

export const peopleStatusParamFor = (isActive: boolean): PeopleStatusParam =>
  isActive ? "ativo" : "inativo"

export const isActiveFromPeopleStatusParam = (
  param: PeopleStatusParam,
): boolean => param === "ativo"

export const peopleRegistryHref = (filters: PeopleFilters): string => {
  const params = new URLSearchParams()
  if (filters.departmentId !== null) {
    params.set(PEOPLE_DEPARTMENT_PARAM, String(filters.departmentId))
  }
  if (filters.isActive !== null) {
    params.set(PEOPLE_STATUS_PARAM, peopleStatusParamFor(filters.isActive))
  }
  const query = params.toString()
  return query === ""
    ? PEOPLE_REGISTRY_PATH
    : `${PEOPLE_REGISTRY_PATH}?${query}`
}

export const activeDepartmentPeopleHref = (departmentId: number): string =>
  peopleRegistryHref({ departmentId, isActive: true })

export const applicablePeopleFilters = (
  filters: PeopleFilters,
  access: GrantedRegistryAccess,
  departmentOptions: readonly DepartmentOption[],
): PeopleFilters => {
  const departmentId = filters.departmentId
  const appliesDepartment =
    access.kind === "director" &&
    departmentId !== null &&
    departmentOptions.some((option) => option.id === departmentId)

  return {
    departmentId: appliesDepartment ? departmentId : null,
    isActive: filters.isActive,
  }
}
