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

export type InsertTagOutcome =
  TagSaved | TagNameTaken | TagDepartmentNotFound | TagDepartmentInactive

export type UpdateTagNameOutcome = TagSaved | TagNameTaken | TagNotFound

export type UpdateTagActiveOutcome =
  TagSaved | TagNotFound | TagDepartmentInactive
