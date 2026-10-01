export interface TagListItem {
  id: number
  name: string
  departmentId: number
  departmentName: string
  departmentIsActive: boolean
  isActive: boolean
  ticketCount: number
  createdAt: Date
}

export interface TagOption {
  id: number
  name: string
}

export interface AllDepartmentsTagScope {
  kind: "all"
}

export interface SingleDepartmentTagScope {
  kind: "department"
  departmentId: number
}

export type TagListScope = AllDepartmentsTagScope | SingleDepartmentTagScope

export interface TagSaved {
  status: "saved"
  id: number
}

export interface TagNameTaken {
  status: "name_taken"
  existingIsActive: boolean
}

export interface TagNotFound {
  status: "not_found"
}

export interface TagDepartmentNotFound {
  status: "department_not_found"
}

export interface TagDepartmentInactive {
  status: "department_inactive"
}

export interface TagDepartmentUnassigned {
  status: "department_unassigned"
}

export interface TagDepartmentFacts {
  isActive: boolean
  isUnassigned: boolean
}

export type TagDepartmentBlock = "department_inactive" | "department_unassigned"

export type InsertTagOutcome =
  | TagSaved
  | TagNameTaken
  | TagDepartmentNotFound
  | TagDepartmentInactive
  | TagDepartmentUnassigned

export type UpdateTagNameOutcome = TagSaved | TagNameTaken | TagNotFound

export type UpdateTagActiveOutcome =
  TagSaved | TagNotFound | TagDepartmentInactive | TagDepartmentUnassigned
