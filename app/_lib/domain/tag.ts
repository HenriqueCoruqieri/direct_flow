import { assignableDepartments } from "@/app/_lib/domain/department"
import type { DepartmentOption } from "@/app/_lib/types/department"
import type {
  GrantedRegistryAccess,
  RegistryAccess,
} from "@/app/_lib/types/registry"
import type {
  TagDepartmentBlock,
  TagDepartmentFacts,
  TagListScope,
} from "@/app/_lib/types/tag"

export const TAG_DEPARTMENT_INACTIVE_MESSAGE =
  "Este setor está inativo. Não é possível criar nem reativar tags nele."

export const TAG_DEPARTMENT_UNASSIGNED_MESSAGE =
  "O setor de pessoas não alocadas não tem tags. Não é possível criar nem reativar tags nele."

export const checkTagDepartment = ({
  isActive,
  isUnassigned,
}: TagDepartmentFacts): TagDepartmentBlock | null => {
  if (isUnassigned) return "department_unassigned"
  if (!isActive) return "department_inactive"
  return null
}

export const canManageTagsOf = (
  access: RegistryAccess,
  departmentId: number,
): boolean => {
  if (access.kind === "director") return true
  if (access.kind === "department_admin") {
    return access.departmentId === departmentId
  }
  return false
}

export const tagScopeFor = (access: GrantedRegistryAccess): TagListScope =>
  access.kind === "director"
    ? { kind: "all" }
    : { kind: "department", departmentId: access.departmentId }

export const tagCreationDepartments = (
  options: readonly DepartmentOption[],
): DepartmentOption[] => assignableDepartments(options)

export const describeTagNameTaken = (existingIsActive: boolean): string =>
  existingIsActive
    ? "Já existe uma tag com esse nome neste setor."
    : "Já existe uma tag inativa com esse nome neste setor. Se quiser usar esse nome, reative-a."
