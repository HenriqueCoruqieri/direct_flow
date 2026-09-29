"use client"

import { useId } from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/_components/ui/select"

const ALL_VALUE = "__all__"

export interface DataTableSelectFilterOption {
  value: string
  label: string
}

interface DataTableSelectFilterProps {
  label: string
  allLabel: string
  options: ReadonlyArray<DataTableSelectFilterOption>
  value: string
  onValueChange: (value: string) => void
}

const DataTableSelectFilter = ({
  label,
  allLabel,
  options,
  value,
  onValueChange,
}: DataTableSelectFilterProps) => {
  const id = useId()

  return (
    <div className="flex items-center">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Select
        value={value === "" ? ALL_VALUE : value}
        onValueChange={(next) => onValueChange(next === ALL_VALUE ? "" : next)}
      >
        <SelectTrigger
          id={id}
          className="h-10 min-w-48 bg-surface data-[size=default]:h-10 dark:bg-surface"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default DataTableSelectFilter
