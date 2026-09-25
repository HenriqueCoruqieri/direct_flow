"use client"

import { SunMoonIcon, UserRoundIcon } from "lucide-react"
import Link from "next/link"

import ThemeRadioGroup from "@/app/_components/theme/theme-radio-group"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu"
import { signOut } from "@/app/_lib/actions/auth"
import { cn } from "@/app/_lib/utils"

import SignOutButton from "./sign-out-button"

interface UserMenuProps {
  label?: string
  children: React.ReactNode
  side?: "top" | "bottom"
  triggerClassName?: string
  contentClassName?: string
}

const UserMenu = ({
  label,
  children,
  side = "bottom",
  triggerClassName,
  contentClassName,
}: UserMenuProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            triggerClassName,
          )}
        >
          {children}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={side}
        align="start"
        sideOffset={8}
        className={contentClassName}
      >
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <SunMoonIcon aria-hidden="true" className="size-4" />
            Tema
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="min-w-40">
            <ThemeRadioGroup />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem asChild>
          <Link href="/perfil">
            <UserRoundIcon aria-hidden="true" className="size-4" />
            Perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={signOut}>
          <SignOutButton />
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default UserMenu
