"use client"

import { SearchIcon } from "lucide-react"
import { useId } from "react"

import { Input } from "@/app/_components/ui/input"

interface DataTableSearchProps {
  label: string
  placeholder?: string
  value: string
  onValueChange: (value: string) => void
}

const DataTableSearch = ({
  label,
  placeholder,
  value,
  onValueChange,
}: DataTableSearchProps) => {
  const id = useId()

  return (
    <div role="search" className="relative flex w-full max-w-80 items-center">
      <SearchIcon
        aria-hidden="true"
        className="pointer-events-none absolute left-3 size-4 text-muted-foreground"
      />
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Input
        id={id}
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className="h-10 bg-surface pl-9 dark:bg-surface"
      />
    </div>
  )
}

export default DataTableSearch
