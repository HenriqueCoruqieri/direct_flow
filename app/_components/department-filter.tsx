"use client"

import { useRouter } from "next/navigation"
import { useId } from "react"

import Combobox from "@/app/_components/combobox"
import { Label } from "@/app/_components/ui/label"
import {
  DEPARTMENT_FILTER_EMPTY_TEXT,
  DEPARTMENT_FILTER_PLACEHOLDER,
  DEPARTMENT_FILTER_SEARCH_PLACEHOLDER,
} from "@/app/_lib/domain/department"

export interface DepartmentFilterOption {
  id: number
  name: string
  href: string
}

interface DepartmentFilterProps {
  label: string
  options: DepartmentFilterOption[]
  value: number
}

const DepartmentFilter = ({ label, options, value }: DepartmentFilterProps) => {
  const router = useRouter()
  const id = useId()

  const select = (departmentId: number) => {
    if (departmentId === value) return
    const target = options.find((option) => option.id === departmentId)
    if (!target) return
    router.push(target.href, { scroll: false })
  }

  return (
    <div className="flex items-center gap-2.5">
      <Label htmlFor={id} className="shrink-0">
        {label}
      </Label>
      <div className="w-56">
        <Combobox
          id={id}
          options={options.map((option) => ({
            value: option.id,
            label: option.name,
          }))}
          value={value}
          onChange={select}
          placeholder={DEPARTMENT_FILTER_PLACEHOLDER}
          searchPlaceholder={DEPARTMENT_FILTER_SEARCH_PLACEHOLDER}
          emptyText={DEPARTMENT_FILTER_EMPTY_TEXT}
        />
      </div>
    </div>
  )
}

export default DepartmentFilter
