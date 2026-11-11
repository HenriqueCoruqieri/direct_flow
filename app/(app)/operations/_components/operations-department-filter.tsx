"use client"

import { useRouter } from "next/navigation"
import { useId } from "react"

import Combobox from "@/app/_components/combobox"
import { Label } from "@/app/_components/ui/label"
import {
  OPERATIONS_DEPARTMENT_FILTER_LABEL,
  operationsDepartmentParamFor,
} from "@/app/_lib/domain/operations"
import type { DepartmentOption } from "@/app/_lib/types/department"
import type { OperationsLocation } from "@/app/_lib/types/operations"
import type { TicketViewerFacts } from "@/app/_lib/types/ticket"
import { operationsHref } from "@/app/_lib/validation/operations"

interface OperationsDepartmentFilterProps {
  viewer: TicketViewerFacts
  location: OperationsLocation
  options: DepartmentOption[]
  value: number
}

const OperationsDepartmentFilter = ({
  viewer,
  location,
  options,
  value,
}: OperationsDepartmentFilterProps) => {
  const router = useRouter()
  const id = useId()

  const select = (departmentId: number) => {
    if (departmentId === value) return
    router.push(
      operationsHref({
        ...location,
        departmentId: operationsDepartmentParamFor(viewer, departmentId),
      }),
      { scroll: false },
    )
  }

  return (
    <div className="flex items-center gap-2.5">
      <Label htmlFor={id} className="shrink-0">
        {OPERATIONS_DEPARTMENT_FILTER_LABEL}
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

export default OperationsDepartmentFilter
