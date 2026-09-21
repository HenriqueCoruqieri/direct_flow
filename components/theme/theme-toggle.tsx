"use client"

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type ThemeToggleProps = {
  className?: string
}

const options = [
  { value: "light", label: "Claro", Icon: SunIcon },
  { value: "dark", label: "Escuro", Icon: MoonIcon },
  { value: "system", label: "Sistema", Icon: MonitorIcon },
] as const

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()

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
          {/* Ícone por CSS, não por estado: evita divergência de hidratação. */}
          <SunIcon aria-hidden="true" className="size-5 dark:hidden" />
          <MoonIcon aria-hidden="true" className="hidden size-5 dark:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuLabel>Tema</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          {options.map(({ value, label, Icon }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
