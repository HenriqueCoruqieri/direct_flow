import type {
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

export const assignableDepartments = (
  options: readonly DepartmentOption[],
): DepartmentOption[] =>
  options.filter((option) => option.isActive && !option.isUnassigned)

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

export const describeDepartmentDeactivationBlock = (
  block: DepartmentDeactivationBlocked,
): string => {
  if (block.reason === "IS_BOARD") {
    return "A Diretoria não pode ser desativada."
  }
  if (block.reason === "IS_UNASSIGNED") {
    return "O setor de pessoas não alocadas não pode ser desativado."
  }

  const pending = [
    block.activeUsers > 0
      ? pluralize(block.activeUsers, "pessoa ativa", "pessoas ativas")
      : null,
    block.openTickets > 0
      ? pluralize(block.openTickets, "chamado em aberto", "chamados em aberto")
      : null,
  ].filter((part): part is string => part !== null)

  return `Não é possível desativar este setor: ele tem ${pending.join(" e ")}. Mova as pessoas para outro setor e conclua ou encaminhe os chamados antes.`
}
