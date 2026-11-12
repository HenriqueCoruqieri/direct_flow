"use client"

import { useRouter } from "next/navigation"
import { useId } from "react"

import Combobox from "@/app/_components/combobox"
import { Label } from "@/app/_components/ui/label"
import {
  DUE_HOURS_DEPARTMENT_FILTER_LABEL,
  dueHoursHref,
} from "@/app/_lib/domain/department-due-hours"
import type { DepartmentOption } from "@/app/_lib/types/department"
import type { RegistryAccess } from "@/app/_lib/types/registry"

interface DueHoursDepartmentFilterProps {
  access: RegistryAccess
  options: DepartmentOption[]
  value: number
}

const DueHoursDepartmentFilter = ({
  access,
  options,
  value,
}: DueHoursDepartmentFilterProps) => {
  const router = useRouter()
  const id = useId()

  const select = (departmentId: number) => {
    if (departmentId === value) return
    router.push(dueHoursHref(access, departmentId), { scroll: false })
  }

  return (
    <div className="flex items-center gap-2.5">
      <Label htmlFor={id} className="shrink-0">
        {DUE_HOURS_DEPARTMENT_FILTER_LABEL}
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
          placeholder="Selecione o setor"
          searchPlaceholder="Buscar setor"
          emptyText="Nenhum setor encontrado."
        />
      </div>
    </div>
  )
}

export default DueHoursDepartmentFilter
