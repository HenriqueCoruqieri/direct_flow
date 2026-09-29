import type {
  DepartmentDeactivationBlocked,
  DepartmentDeactivationCheck,
  DepartmentDependencies,
} from "@/app/_lib/types/department"

export const BOARD_DEPARTMENT_NAME = "Diretoria"

export const DEPARTMENT_NAME_MIN_LENGTH = 2

export const DEPARTMENT_NAME_MAX_LENGTH = 80

export const checkDepartmentDeactivation = ({
  isBoard,
  activeUsers,
  openTickets,
}: DepartmentDependencies): DepartmentDeactivationCheck => {
  if (isBoard) {
    return { ok: false, reason: "IS_BOARD", activeUsers, openTickets }
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
