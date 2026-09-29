import type {
  DirectorAccess,
  GrantedRegistryAccess,
  RegistryAccess,
  RegistryAccessFacts,
  RegistryNavItem,
} from "@/app/_lib/types/registry"

export const REGISTRY_NAME_MIN_LENGTH = 2

export const REGISTRY_NAME_MAX_LENGTH = 80

export const DEPARTMENTS_REGISTRY_PATH = "/cadastros/setores"

export const TAGS_REGISTRY_PATH = "/cadastros/tags"

const NO_REGISTRY_ACCESS: RegistryAccess = { kind: "none" }

export const resolveRegistryAccess = (
  facts: RegistryAccessFacts | null,
): RegistryAccess => {
  if (!facts || !facts.isActive) return NO_REGISTRY_ACCESS
  if (facts.isBoard) {
    return { kind: "director", departmentId: facts.departmentId }
  }
  if (facts.role === "admin") {
    return { kind: "department_admin", departmentId: facts.departmentId }
  }
  return NO_REGISTRY_ACCESS
}

export const hasRegistryAccess = (
  access: RegistryAccess,
): access is GrantedRegistryAccess => access.kind !== "none"

export const isDirectorAccess = (
  access: RegistryAccess,
): access is DirectorAccess => access.kind === "director"

const PEOPLE_ITEM: RegistryNavItem = {
  section: "pessoas",
  label: "Pessoas",
  href: null,
}

const DEPARTMENTS_ITEM: RegistryNavItem = {
  section: "setores",
  label: "Setores",
  href: DEPARTMENTS_REGISTRY_PATH,
}

const TAGS_ITEM: RegistryNavItem = {
  section: "tags",
  label: "Tags",
  href: TAGS_REGISTRY_PATH,
}

export const registryNavItemsFor = (
  access: RegistryAccess,
): RegistryNavItem[] => {
  if (access.kind === "director") {
    return [PEOPLE_ITEM, DEPARTMENTS_ITEM, TAGS_ITEM]
  }
  if (access.kind === "department_admin") {
    return [PEOPLE_ITEM, TAGS_ITEM]
  }
  return []
}
