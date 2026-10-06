import { activeDepartmentPeopleHref } from "@/app/_lib/domain/people-filters"
import type {
  DepartmentAvailability,
  DepartmentDeactivationBlocked,
  DepartmentDeactivationCheck,
  DepartmentDependencies,
  DepartmentOption,
  DepartmentStamps,
} from "@/app/_lib/types/department"

export const BOARD_DEPARTMENT_NAME = "Diretoria"

export const UNASSIGNED_DEPARTMENT_NAME = "Não alocado"

export const BOARD_DEPARTMENT_BADGE = "Diretoria"

export const UNASSIGNED_DEPARTMENT_BADGE = "Não alocado"

export const departmentBadgeFor = ({
  isBoard,
  isUnassigned,
}: DepartmentStamps): string | null => {
  if (isBoard) return BOARD_DEPARTMENT_BADGE
  if (isUnassigned) return UNASSIGNED_DEPARTMENT_BADGE
  return null
}

export const isAssignableDepartment = ({
  isActive,
  isUnassigned,
}: DepartmentAvailability): boolean => isActive && !isUnassigned

export const assignableDepartments = (
  options: readonly DepartmentOption[],
): DepartmentOption[] => options.filter(isAssignableDepartment)

export const checkDepartmentDeactivation = ({
  isBoard,
  isUnassigned,
  activeUsers,
  openTickets,
}: DepartmentDependencies): DepartmentDeactivationCheck => {
  if (isBoard) {
    return { ok: false, reason: "IS_BOARD", activeUsers, openTickets }
  }
  if (isUnassigned) {
    return { ok: false, reason: "IS_UNASSIGNED", activeUsers, openTickets }
  }
  if (activeUsers > 0) {
    return { ok: false, reason: "HAS_ACTIVE_USERS", activeUsers, openTickets }
  }
  if (openTickets > 0) {
    return { ok: false, reason: "HAS_OPEN_TICKETS", activeUsers, openTickets }
  }
  return { ok: true }
}

const pluralize = (count: number, singular: string, plural: string): string =>
  `${count} ${count === 1 ? singular : plural}`

const capitalize = (text: string): string =>
  `${text.charAt(0).toUpperCase()}${text.slice(1)}`

const isPresent = (part: string | null): part is string => part !== null

export const isDepartmentDeactivationLocked = (
  check: DepartmentDeactivationCheck,
): boolean =>
  !check.ok && (check.reason === "IS_BOARD" || check.reason === "IS_UNASSIGNED")

export const describeDepartmentDeactivationBlock = (
  block: DepartmentDeactivationBlocked,
): string => {
  if (block.reason === "IS_BOARD") {
    return "A Diretoria não pode ser desativada."
  }
  if (block.reason === "IS_UNASSIGNED") {
    return "O setor de pessoas não alocadas não pode ser desativado."
  }

  const { activeUsers, openTickets } = block
  const pending = [
    activeUsers > 0
      ? pluralize(activeUsers, "pessoa ativa", "pessoas ativas")
      : null,
    openTickets > 0
      ? pluralize(openTickets, "chamado em aberto", "chamados em aberto")
      : null,
  ].filter(isPresent)
  const instructions = [
    activeUsers > 0
      ? `mova ${activeUsers === 1 ? "a pessoa" : "as pessoas"} para outro setor`
      : null,
    openTickets > 0
      ? `conclua ou encaminhe ${openTickets === 1 ? "o chamado" : "os chamados"}`
      : null,
  ].filter(isPresent)

  if (pending.length === 0) return "Não é possível desativar este setor."

  return `Não é possível desativar este setor: ele tem ${pending.join(" e ")}. ${capitalize(instructions.join(" e "))} antes.`
}

export const deactivationBlockPeopleHref = (
  departmentId: number,
  block: DepartmentDeactivationBlocked,
): string | null =>
  !isDepartmentDeactivationLocked(block) && block.activeUsers > 0
    ? activeDepartmentPeopleHref(departmentId)
    : null
