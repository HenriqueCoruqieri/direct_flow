"use client"

import { ChevronRightIcon, FolderIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/app/_components/ui/collapsible"
import type { RegistryNavItem } from "@/app/_lib/types/registry"

interface RegistryNavProps {
  items: RegistryNavItem[]
}

const RegistryNav = ({ items }: RegistryNavProps) => {
  const pathname = usePathname()
  const isCurrent = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)
  const inRegistry = items.some((item) => isCurrent(item.href))

  return (
    <Collapsible defaultOpen={inRegistry}>
      <CollapsibleTrigger
        data-active={inRegistry || undefined}
        className="group/registry flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-sm font-semibold text-text-tertiary transition-colors outline-none hover:bg-surface-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-active:text-foreground"
      >
        <span className="flex group-data-active/registry:text-primary [&_svg]:size-4.5">
          <FolderIcon aria-hidden="true" />
        </span>
        Cadastros
        <ChevronRightIcon
          aria-hidden="true"
          className="ml-auto size-4 transition-transform group-data-[state=open]/registry:rotate-90 motion-reduce:transition-none"
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="mt-1 ml-5 flex flex-col gap-1 border-l border-border-subtle pl-3">
          {items.map((item) => (
            <li key={item.section}>
              <Link
                href={item.href}
                aria-current={isCurrent(item.href) ? "page" : undefined}
                className="flex h-9 items-center rounded-lg px-3 text-sm font-semibold text-text-tertiary transition-colors outline-none hover:bg-surface-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:bg-surface-active aria-[current=page]:font-extrabold aria-[current=page]:text-foreground"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  )
}

export default RegistryNav
