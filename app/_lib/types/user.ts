import type { Role } from "@/app/_lib/types/actor"

export interface UserProfile {
  id: number
  name: string
  email: string
  role: Role
  departmentId: number
  departmentName: string
  image: string | null
  isActive: boolean
  createdAt: Date
  lastLoginAt: Date | null
}
