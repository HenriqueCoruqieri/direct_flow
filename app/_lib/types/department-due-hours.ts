import type { TicketPriority } from "@/app/_lib/types/ticket"

export interface DepartmentDueHours {
  criticaHours: number
  altaHours: number
  mediaHours: number
  baixaHours: number
}

export type DueHoursField = keyof DepartmentDueHours

export interface DepartmentDueHoursRecord extends DepartmentDueHours {
  departmentId: number
  updatedAt: Date
  updatedByName: string | null
}

export interface DueHoursFieldCopy {
  label: string
  description: string
  unit: string
}

export interface DeclinedDueFacts {
  fromDueAt: Date | null
  sentAt: Date
  returnedAt: Date
  priority: TicketPriority
  returnDepartmentHours: DepartmentDueHours | null
}

export interface DepartmentDueHoursView {
  hours: DepartmentDueHours
  isDefault: boolean
  lastChange: string | null
}
