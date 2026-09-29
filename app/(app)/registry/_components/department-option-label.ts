import { departmentBadgeFor } from "@/app/_lib/domain/department"
import type { DepartmentOption } from "@/app/_lib/types/department"

const departmentOptionLabel = (option: DepartmentOption): string => {
  const badge = departmentBadgeFor(option)
  const notes = [
    badge !== null && badge !== option.name ? badge : null,
    option.isActive ? null : "inativo",
  ].filter((note): note is string => note !== null)

  return notes.length > 0 ? `${option.name} (${notes.join(", ")})` : option.name
}

export default departmentOptionLabel
