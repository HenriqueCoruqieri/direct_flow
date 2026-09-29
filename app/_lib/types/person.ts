import type { Role } from "@/app/_lib/types/actor"

export interface PersonManagementFacts {
  role: Role
  departmentId: number
  departmentIsUnassigned: boolean
}

export interface PersonListItem extends PersonManagementFacts {
  id: number
  name: string
  email: string
  image: string | null
  departmentName: string
  departmentIsBoard: boolean
  departmentIsActive: boolean
  isActive: boolean
  lastLoginAt: Date | null
  createdAt: Date
}

export interface ManagedPerson extends PersonManagementFacts {
  id: number
  isActive: boolean
  departmentIsActive: boolean
  departmentIsBoard: boolean
}

export interface PersonDepartmentFacts {
  id: number
  isActive: boolean
  isBoard: boolean
  isUnassigned: boolean
}

export interface AllPeopleScope {
  kind: "all"
}

export interface ManagedDepartmentPeopleScope {
  kind: "department_and_unassigned"
  departmentId: number
}

export type PersonListScope = AllPeopleScope | ManagedDepartmentPeopleScope

export interface PersonPlacementRequest {
  departmentId: number
  role?: Role
}

export type PersonDenialReason =
  | "FORBIDDEN"
  | "DEPARTMENT_NOT_FOUND"
  | "DEPARTMENT_INACTIVE"
  | "DEPARTMENT_UNASSIGNED"
  | "SELF_DEACTIVATION"
  | "SELF_PASSWORD_RESTORE"

export interface PersonActionDenied {
  ok: false
  reason: PersonDenialReason
}

export interface PersonActionAllowed {
  ok: true
}

export type PersonActionCheck = PersonActionAllowed | PersonActionDenied

export interface PersonPlacementAllowed {
  ok: true
  role: Role
  departmentId: number
  departmentChanged: boolean
}

export type PersonPlacementDecision =
  PersonPlacementAllowed | PersonActionDenied

export interface InsertPersonValues {
  name: string
  email: string
  role: Role
  departmentId: number
  passwordHash: string
}

export interface UpdatePersonValues {
  id: number
  name: string
  email: string
  role: Role
  departmentId: number
}

export interface PersonSaved {
  status: "saved"
  id: number
}

export interface PersonEmailTaken {
  status: "email_taken"
}

export interface PersonNotFound {
  status: "not_found"
}

export interface PersonDepartmentInactive {
  status: "department_inactive"
}

export interface PersonLastDirector {
  status: "last_director"
}

export type InsertPersonOutcome =
  PersonSaved | PersonEmailTaken | PersonDepartmentInactive

export type UpdatePersonOutcome =
  | PersonSaved
  | PersonEmailTaken
  | PersonNotFound
  | PersonDepartmentInactive
  | PersonLastDirector

export type UpdatePersonActiveOutcome =
  PersonSaved | PersonNotFound | PersonDepartmentInactive | PersonLastDirector

export type ResetPersonPasswordOutcome = PersonSaved | PersonNotFound
