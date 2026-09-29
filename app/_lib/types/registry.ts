import type { Role } from "@/app/_lib/types/actor"

export interface RegistryAccessFacts {
  isActive: boolean
  role: Role
  departmentId: number
  isBoard: boolean
  isUnassigned: boolean
  mustChangePassword: boolean
}

export interface DirectorAccess {
  kind: "director"
  departmentId: number
}

export interface DepartmentAdminAccess {
  kind: "department_admin"
  departmentId: number
}

export interface NoRegistryAccess {
  kind: "none"
}

export type GrantedRegistryAccess = DirectorAccess | DepartmentAdminAccess

export type RegistryAccess = GrantedRegistryAccess | NoRegistryAccess

export type RegistrySection = "people" | "departments" | "tags"

export interface RegistryNavItem {
  section: RegistrySection
  label: string
  href: string
}
