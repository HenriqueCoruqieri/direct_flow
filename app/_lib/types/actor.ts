import type { Role } from "@/db/schema"

export interface Actor {
  id: number
  name: string
  email: string
  role: Role
  departmentId: number
}

export type { Role }
