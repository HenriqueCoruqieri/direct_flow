import type { NavBadge, NavBadgeAccessFacts } from "@/app/_lib/types/nav-badge"

export const NAV_BADGE_MAX = 99

export const formatNavBadgeCount = (count: number): string =>
  count > NAV_BADGE_MAX ? `${NAV_BADGE_MAX}+` : String(count)

export const navBadgeDepartmentIdFor = (
  facts: NavBadgeAccessFacts | null,
): number | null =>
  facts === null || facts.isUnassigned ? null : facts.departmentId

export const navBadgeFor = (
  count: number,
  accessibleLabel: string,
): NavBadge | null =>
  count > 0 ? { text: formatNavBadgeCount(count), accessibleLabel } : null
