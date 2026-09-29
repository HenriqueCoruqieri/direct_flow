"use client"

import { ChevronRightIcon, FolderCogIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Badge } from "@/app/_components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/app/_components/ui/collapsible"
import type { RegistryNavItem } from "@/app/_lib/types/registry"

const CADASTROS_PREFIX = "/cadastros/"

interface CadastrosNavProps {
  items: RegistryNavItem[]
}

const CadastrosNav = ({ items }: CadastrosNavProps) => {
  const pathname = usePathname()
  const inCadastros = pathname.startsWith(CADASTROS_PREFIX)

  return (
    <Collapsible defaultOpen={inCadastros}>
      <CollapsibleTrigger
        data-active={inCadastros || undefined}
        className="group/cadastros flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-sm font-semibold text-text-tertiary transition-colors outline-none hover:bg-surface-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-active:text-foreground"
      >
        <span className="flex group-data-active/cadastros:text-primary [&_svg]:size-4.5">
          <FolderCogIcon aria-hidden="true" />
        </span>
        Cadastros
        <ChevronRightIcon
          aria-hidden="true"
          className="ml-auto size-4 transition-transform group-data-[state=open]/cadastros:rotate-90 motion-reduce:transition-none"
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="mt-1 ml-5 flex flex-col gap-1 border-l border-border-subtle pl-3">
          {items.map((item) => (
            <li key={item.section}>
              {item.href ? (
                <Link
                  href={item.href}
                  aria-current={
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`)
                      ? "page"
                      : undefined
                  }
                  className="flex h-9 items-center rounded-lg px-3 text-sm font-semibold text-text-tertiary transition-colors outline-none hover:bg-surface-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:bg-surface-active aria-[current=page]:font-extrabold aria-[current=page]:text-foreground"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className="flex h-9 cursor-not-allowed items-center gap-2 px-3 text-sm font-semibold text-muted-foreground"
                >
                  {item.label}
                  <Badge variant="secondary" className="text-muted-foreground">
                    em breve
                  </Badge>
                </span>
              )}
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  )
}

export default CadastrosNav
