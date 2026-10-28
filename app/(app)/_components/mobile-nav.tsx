"use client"

import { MenuIcon, XIcon } from "lucide-react"
import { usePathname } from "next/navigation"
import { useState } from "react"

import LogoMark from "@/app/_components/logo-mark"
import { Button } from "@/app/_components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/app/_components/ui/sheet"
import type { ApprovalsNavBadge } from "@/app/_lib/types/approvals"
import type { RegistryNavItem } from "@/app/_lib/types/registry"

import AppNav from "./app-nav"

interface MobileNavProps {
  registryItems: RegistryNavItem[]
  showDepartmentQueue: boolean
  approvalsBadge: ApprovalsNavBadge | null
}

const MobileNav = ({
  registryItems,
  showDepartmentQueue,
  approvalsBadge,
}: MobileNavProps) => {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [openedAt, setOpenedAt] = useState(pathname)

  if (pathname !== openedAt) {
    setOpenedAt(pathname)
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Abrir menu"
          aria-expanded={open}
          className="-ml-3 size-11 shrink-0 lg:hidden"
        >
          <MenuIcon aria-hidden="true" className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        showCloseButton={false}
        aria-describedby={undefined}
        className="w-72 gap-1.5 overflow-y-auto border-border-subtle bg-surface-bar pt-safe-5 px-safe-4 pb-safe-5"
      >
        <SheetHeader className="flex-row items-center gap-2.5 px-2 pt-0 pb-4.5">
          <LogoMark size="sm" variant="tint" />
          <SheetTitle className="flex-1 text-base font-semibold">
            Direct Flow
          </SheetTitle>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Fechar menu">
              <XIcon aria-hidden="true" className="size-4" />
            </Button>
          </SheetClose>
        </SheetHeader>
        <AppNav
          registryItems={registryItems}
          showDepartmentQueue={showDepartmentQueue}
          approvalsBadge={approvalsBadge}
        />
      </SheetContent>
    </Sheet>
  )
}

export default MobileNav
