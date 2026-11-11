import { forcedRoleFor } from "@/app/_lib/domain/person"
import type {
  DepartmentAdminsDenialReason,
  DepartmentAdminsEditability,
  DepartmentAdminsPlan,
  DepartmentAdminsRequest,
  DepartmentMemberRole,
} from "@/app/_lib/types/department-admins"

export const DEPARTMENT_ADMINS_MAX_MEMBERS = 1000

export const DEPARTMENT_ADMINS_DENIAL_MESSAGES = {
  NOT_EDITABLE:
    "Os administradores deste setor não podem ser alterados por aqui.",
  MEMBERS_CHANGED:
    "As pessoas deste setor mudaram enquanto você editava. A lista foi atualizada: abra a edição de novo e confira os administradores.",
} satisfies Record<DepartmentAdminsDenialReason, string>

export const BOARD_ADMINS_NOTE =
  "Na Diretoria todas as pessoas são sempre administradoras."

export const UNASSIGNED_ADMINS_NOTE =
  "Alocar o usuário em algum setor antes de torna-lo administrador"

export const canEditDepartmentAdmins = ({
  isActive,
  isBoard,
  isUnassigned,
}: DepartmentAdminsEditability): boolean =>
  isActive && !isBoard && !isUnassigned

export const departmentAdminsNoteFor = ({
  isBoard,
  isUnassigned,
}: DepartmentAdminsEditability): string | null => {
  if (isBoard) return BOARD_ADMINS_NOTE
  if (isUnassigned) return UNASSIGNED_ADMINS_NOTE
  return null
}

export const departmentAdminIdsOf = (
  members: readonly DepartmentMemberRole[],
): number[] =>
  members.filter((member) => member.role === "admin").map(({ id }) => id)

const sameIds = (
  left: readonly number[],
  right: readonly number[],
): boolean => {
  const rightIds = new Set(right)
  return (
    new Set(left).size === rightIds.size && left.every((id) => rightIds.has(id))
  )
}

export const planDepartmentAdmins = (
  department: DepartmentAdminsEditability,
  members: readonly DepartmentMemberRole[],
  request: DepartmentAdminsRequest,
): DepartmentAdminsPlan => {
  if (!canEditDepartmentAdmins(department)) {
    return { ok: false, reason: "NOT_EDITABLE" }
  }

  const memberIds = members.map(({ id }) => id)
  if (!sameIds(memberIds, request.memberIds)) {
    return { ok: false, reason: "MEMBERS_CHANGED" }
  }

  const adminIds = new Set(request.adminIds)
  const forcedRole = forcedRoleFor(department)
  const promotedIds: number[] = []
  const demotedIds: number[] = []

  for (const member of members) {
    const role = forcedRole ?? (adminIds.has(member.id) ? "admin" : "member")
    if (role === member.role) continue
    if (role === "admin") promotedIds.push(member.id)
    else demotedIds.push(member.id)
  }

  return { ok: true, promotedIds, demotedIds }
}
