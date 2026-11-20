export type NavBadgeTone = "warning" | "destructive"

export interface NavBadge {
  text: string
  accessibleLabel: string
  tone: NavBadgeTone
}

export interface NavBadgeAccessFacts {
  departmentId: number
  isUnassigned: boolean
}
