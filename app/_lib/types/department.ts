export interface DepartmentListItem {
  id: number
  name: string
  isActive: boolean
  isBoard: boolean
  isUnassigned: boolean
  activeUsers: number
  openTickets: number
  createdAt: Date
}

export interface DepartmentStamps {
  isBoard: boolean
  isUnassigned: boolean
}

export interface DepartmentDependencies extends DepartmentStamps {
  activeUsers: number
  openTickets: number
}

export type DepartmentDeactivationBlockReason =
  "IS_BOARD" | "IS_UNASSIGNED" | "HAS_ACTIVE_USERS" | "HAS_OPEN_TICKETS"

export interface DepartmentDeactivationAllowed {
  ok: true
}

export interface DepartmentDeactivationBlocked {
  ok: false
  reason: DepartmentDeactivationBlockReason
  activeUsers: number
  openTickets: number
}

export type DepartmentDeactivationCheck =
  DepartmentDeactivationAllowed | DepartmentDeactivationBlocked

export interface DepartmentSaved {
  status: "saved"
  id: number
}

export interface DepartmentNameTaken {
  status: "name_taken"
}

export interface DepartmentNotFound {
  status: "not_found"
}

export interface DepartmentDeactivationRefused {
  status: "blocked"
  block: DepartmentDeactivationBlocked
}

export type InsertDepartmentOutcome = DepartmentSaved | DepartmentNameTaken

export type UpdateDepartmentNameOutcome =
  DepartmentSaved | DepartmentNameTaken | DepartmentNotFound

export type UpdateDepartmentActiveOutcome =
  DepartmentSaved | DepartmentNotFound | DepartmentDeactivationRefused

export interface DepartmentOption extends DepartmentStamps {
  id: number
  name: string
  isActive: boolean
}
