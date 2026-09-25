import type { Role } from "@/app/_lib/types/actor"

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  member: "Membro",
}

const nameParts = (name: string): string[] =>
  name.trim().split(/\s+/).filter(Boolean)

export const getFirstName = (name: string): string => nameParts(name)[0] ?? ""

export const getInitials = (name: string): string => {
  const parts = nameParts(name)
  const first = parts[0] ?? ""
  const last = parts.length > 1 ? (parts[parts.length - 1] ?? "") : ""
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

export const describeMembership = (
  departmentName: string,
  role: Role,
): string => `${departmentName} · ${ROLE_LABELS[role]}`

export const describeAccountStatus = (isActive: boolean): string =>
  isActive ? "Ativo" : "Inativo"
