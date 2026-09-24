"use client"

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"

import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/app/_components/ui/dropdown-menu"

const options = [
  { value: "light", label: "Claro", Icon: SunIcon },
  { value: "dark", label: "Escuro", Icon: MoonIcon },
  { value: "system", label: "Sistema", Icon: MonitorIcon },
] as const

const ThemeRadioGroup = () => {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
      {options.map(({ value, label, Icon }) => (
        <DropdownMenuRadioItem key={value} value={value}>
          <Icon aria-hidden="true" className="size-4" />
          {label}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  )
}

export default ThemeRadioGroup
