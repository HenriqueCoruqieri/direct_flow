"use client"

import { useRouter } from "next/navigation"
import { useId } from "react"

import Combobox from "@/app/_components/combobox"
import { Label } from "@/app/_components/ui/label"
import {
  DEPARTMENT_QUEUE_DEPARTMENT_FILTER_LABEL,
  queueDepartmentParamFor,
} from "@/app/_lib/domain/department-queue"
import type { DepartmentOption } from "@/app/_lib/types/department"
import type { DepartmentQueueLocation } from "@/app/_lib/types/department-queue"
import type { TicketViewerFacts } from "@/app/_lib/types/ticket"
import { departmentQueueHref } from "@/app/_lib/validation/department-queue"

interface QueueDepartmentFilterProps {
  viewer: TicketViewerFacts
  location: DepartmentQueueLocation
  options: DepartmentOption[]
  value: number
}

const QueueDepartmentFilter = ({
  viewer,
  location,
  options,
  value,
}: QueueDepartmentFilterProps) => {
  const router = useRouter()
  const id = useId()

  const select = (departmentId: number) => {
    if (departmentId === value) return
    router.push(
      departmentQueueHref({
        ...location,
        departmentId: queueDepartmentParamFor(viewer, departmentId),
      }),
      { scroll: false },
    )
  }

  return (
    <div className="flex items-center gap-2.5">
      <Label htmlFor={id} className="shrink-0">
        {DEPARTMENT_QUEUE_DEPARTMENT_FILTER_LABEL}
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

export default QueueDepartmentFilter
