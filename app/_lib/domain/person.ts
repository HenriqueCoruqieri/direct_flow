import { assignableDepartments } from "@/app/_lib/domain/department"
import type { Role } from "@/app/_lib/types/actor"
import type {
  DepartmentOption,
  DepartmentStamps,
} from "@/app/_lib/types/department"
import type {
  ManagedPerson,
  PersonActionCheck,
  PersonActionDenied,
  PersonDenialReason,
  PersonDepartmentFacts,
  PersonListScope,
  PersonManagementFacts,
  PersonPlacementDecision,
  PersonPlacementRequest,
} from "@/app/_lib/types/person"
import type {
  GrantedRegistryAccess,
  RegistryAccess,
} from "@/app/_lib/types/registry"

export const NEVER_ACCESSED_LABEL = "Nunca acessou"

export const PERSON_DENIAL_MESSAGES = {
  FORBIDDEN: "Você não tem permissão para gerenciar esta pessoa.",
  DEPARTMENT_NOT_FOUND: "Setor não encontrado.",
  DEPARTMENT_INACTIVE:
    "Este setor está inativo. Não é possível colocar nem reativar pessoas nele.",
  DEPARTMENT_UNASSIGNED:
    "Ninguém é cadastrado direto no setor de pessoas não alocadas. Escolha outro setor.",
  SELF_DEACTIVATION: "Você não pode desativar a sua própria conta.",
  SELF_PASSWORD_RESTORE:
    "Para trocar a sua própria senha, use a página do seu perfil.",
} satisfies Record<PersonDenialReason, string>

export const LAST_DIRECTOR_MESSAGE =
  "Esta é a última pessoa ativa da Diretoria. Coloque outra pessoa na Diretoria antes de desativá-la ou tirá-la de lá."

const deny = (reason: PersonDenialReason): PersonActionDenied => ({
  ok: false,
  reason,
})

export const personScopeFor = (
  access: GrantedRegistryAccess,
): PersonListScope =>
  access.kind === "director"
    ? { kind: "all" }
    : { kind: "department_and_unassigned", departmentId: access.departmentId }

export const canManagePerson = (
  access: RegistryAccess,
  person: PersonManagementFacts,
): boolean => {
  if (access.kind === "director") return true
  if (access.kind === "department_admin") {
    return (
      person.role === "member" &&
      (person.departmentId === access.departmentId ||
        person.departmentIsUnassigned)
    )
  }
  return false
}

export const canAssignRole = (access: RegistryAccess): boolean =>
  access.kind === "director"

export const forcedRoleFor = (department: DepartmentStamps): Role | null =>
  department.isBoard ? "admin" : null

export const personCreationDepartments = (
  options: readonly DepartmentOption[],
): DepartmentOption[] => assignableDepartments(options)

export const personMoveDepartments = (
  access: GrantedRegistryAccess,
  options: readonly DepartmentOption[],
  currentDepartmentId: number,
): DepartmentOption[] =>
  options.filter((option) => {
    if (option.id === currentDepartmentId) return true
    if (access.kind === "department_admin") {
      return option.id === access.departmentId || option.isUnassigned
    }
    return option.isActive
  })

export const decidePersonCreation = (
  access: RegistryAccess,
  request: PersonPlacementRequest,
  department: PersonDepartmentFacts | null,
): PersonPlacementDecision => {
  if (access.kind === "none") return deny("FORBIDDEN")
  if (access.kind === "department_admin") {
    if (request.departmentId !== access.departmentId) return deny("FORBIDDEN")
    if (request.role !== undefined && request.role !== "member") {
      return deny("FORBIDDEN")
    }
  }
  if (!department) return deny("DEPARTMENT_NOT_FOUND")
  if (department.isUnassigned) return deny("DEPARTMENT_UNASSIGNED")
  if (!department.isActive) return deny("DEPARTMENT_INACTIVE")

  const role =
    access.kind === "director"
      ? (forcedRoleFor(department) ?? request.role ?? "member")
      : "member"

  return {
    ok: true,
    role,
    departmentId: department.id,
    departmentChanged: true,
  }
}

export const decidePersonUpdate = (
  access: RegistryAccess,
  person: ManagedPerson,
  request: PersonPlacementRequest,
  department: PersonDepartmentFacts | null,
): PersonPlacementDecision => {
  if (!canManagePerson(access, person)) return deny("FORBIDDEN")
  if (access.kind === "department_admin") {
    const withinReach =
      request.departmentId === access.departmentId ||
      department?.isUnassigned === true
    if (!withinReach) return deny("FORBIDDEN")
    if (request.role !== undefined && request.role !== "member") {
      return deny("FORBIDDEN")
    }
  }
  if (!department) return deny("DEPARTMENT_NOT_FOUND")

  const departmentChanged = department.id !== person.departmentId
  if (departmentChanged && !department.isActive) {
    return deny("DEPARTMENT_INACTIVE")
  }

  const role =
    access.kind === "director"
      ? (forcedRoleFor(department) ?? request.role ?? person.role)
      : person.role

  return { ok: true, role, departmentId: department.id, departmentChanged }
}

export const checkPersonActivation = (
  access: RegistryAccess,
  actorId: number,
  person: ManagedPerson,
  isActive: boolean,
): PersonActionCheck => {
  if (!canManagePerson(access, person)) return deny("FORBIDDEN")
  if (!isActive && person.id === actorId) return deny("SELF_DEACTIVATION")
  if (isActive && !person.departmentIsActive) {
    return deny("DEPARTMENT_INACTIVE")
  }
  return { ok: true }
}

export const checkPasswordRestore = (
  access: RegistryAccess,
  actorId: number,
  person: ManagedPerson,
): PersonActionCheck => {
  if (!canManagePerson(access, person)) return deny("FORBIDDEN")
  if (person.id === actorId) return deny("SELF_PASSWORD_RESTORE")
  return { ok: true }
}
