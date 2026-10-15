"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import type { ApprovalsNavBadge } from "@/app/_lib/types/approvals"

interface NavItemProps {
  href: string
  label: string
  icon: React.ReactNode
  badge?: ApprovalsNavBadge | null
}

const NavItem = ({ href, label, icon, badge = null }: NavItemProps) => {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      aria-label={badge?.accessibleLabel}
      className="group/nav flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-semibold text-text-tertiary transition-colors outline-none hover:bg-surface-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:bg-surface-active aria-[current=page]:font-extrabold aria-[current=page]:text-foreground"
    >
      <span
        aria-hidden="true"
        className="flex group-aria-[current=page]/nav:text-primary [&_svg]:size-4.5"
      >
        {icon}
      </span>
      {label}
      {badge !== null ? (
        <span
          aria-hidden="true"
          className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-warning-border bg-warning px-1.5 text-xs font-bold text-warning-foreground tabular-nums"
        >
          {badge.text}
        </span>
      ) : null}
    </Link>
  )
}

export default NavItem
