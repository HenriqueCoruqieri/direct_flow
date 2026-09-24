"use client"

import { MoonIcon, SunIcon } from "lucide-react"

import ThemeRadioGroup from "@/app/_components/theme/theme-radio-group"
import { Button } from "@/app/_components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu"
import { cn } from "@/app/_lib/utils"

interface ThemeToggleProps {
  className?: string
}

const ThemeToggle = ({ className }: ThemeToggleProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Alterar tema"
          className={cn(
            "size-11 rounded-full text-text-secondary hover:text-foreground focus-visible:ring-ring",
            className,
          )}
        >
          <SunIcon aria-hidden="true" className="size-5 dark:hidden" />
          <MoonIcon aria-hidden="true" className="hidden size-5 dark:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuLabel>Tema</DropdownMenuLabel>
        <ThemeRadioGroup />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ThemeToggle
