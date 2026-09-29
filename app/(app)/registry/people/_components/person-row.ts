import type { DepartmentOption } from "@/app/_lib/types/department"
import type { PersonListItem } from "@/app/_lib/types/person"
import type { GrantedRegistryAccess } from "@/app/_lib/types/registry"

export interface PersonRowContext {
  access: GrantedRegistryAccess
  actorId: number
  departmentOptions: DepartmentOption[]
}

export interface PersonRow extends PersonListItem {
  context: PersonRowContext
}
