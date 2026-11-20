import type {
  NavBadge,
  NavBadgeAccessFacts,
  NavBadgeTone,
} from "@/app/_lib/types/nav-badge"

export const NAV_BADGE_MAX = 99

export const DEFAULT_NAV_BADGE_TONE: NavBadgeTone = "warning"

export const formatNavBadgeCount = (count: number): string =>
  count > NAV_BADGE_MAX ? `${NAV_BADGE_MAX}+` : String(count)

export const navBadgeDepartmentIdFor = (
  facts: NavBadgeAccessFacts | null,
): number | null =>
  facts === null || facts.isUnassigned ? null : facts.departmentId

export const navBadgeFor = (
  count: number,
  accessibleLabel: string,
  tone: NavBadgeTone = DEFAULT_NAV_BADGE_TONE,
): NavBadge | null =>
  count > 0 ? { text: formatNavBadgeCount(count), accessibleLabel, tone } : null
