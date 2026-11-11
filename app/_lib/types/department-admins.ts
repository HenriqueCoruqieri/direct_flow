import type { Role } from "@/app/_lib/types/actor"
import type { DepartmentStamps } from "@/app/_lib/types/department"

export interface DepartmentAdminsEditability extends DepartmentStamps {
  isActive: boolean
}

export interface DepartmentMemberRole {
  id: number
  role: Role
}

export interface DepartmentMember extends DepartmentMemberRole {
  name: string
  email: string
  departmentId: number
}

export interface DepartmentAdminsRequest {
  memberIds: readonly number[]
  adminIds: readonly number[]
}

export type DepartmentAdminsDenialReason = "NOT_EDITABLE" | "MEMBERS_CHANGED"

export interface DepartmentAdminsDenied {
  ok: false
  reason: DepartmentAdminsDenialReason
}

export interface DepartmentAdminsChanges {
  ok: true
  promotedIds: number[]
  demotedIds: number[]
}

export type DepartmentAdminsPlan =
  DepartmentAdminsChanges | DepartmentAdminsDenied
