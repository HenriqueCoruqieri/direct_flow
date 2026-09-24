"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

interface NavItemProps {
  href: string
  label: string
  icon: React.ReactNode
}

const NavItem = ({ href, label, icon }: NavItemProps) => {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="group/nav flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-semibold text-text-tertiary transition-colors outline-none hover:bg-surface-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:bg-surface-active aria-[current=page]:font-extrabold aria-[current=page]:text-foreground"
    >
      <span className="flex group-aria-[current=page]/nav:text-primary [&_svg]:size-4.5">
        {icon}
      </span>
      {label}
    </Link>
  )
}

export default NavItem
