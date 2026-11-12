import { z } from "zod"

import {
  DUE_HOURS_DEPARTMENT_PARAM,
  DUE_HOURS_MAX,
  DUE_HOURS_MIN,
} from "@/app/_lib/domain/department-due-hours"
import { TICKET_PRIORITY_LABELS } from "@/app/_lib/domain/ticket"
import type { TicketPriority } from "@/app/_lib/types/ticket"
import { departmentIdSchema } from "@/app/_lib/validation/department"
import { idSearchParamSchema } from "@/app/_lib/validation/search-params"

const dueHoursSchema = (priority: TicketPriority) => {
  const requiredMessage = `Informe um prazo em horas inteiras para a prioridade ${TICKET_PRIORITY_LABELS[priority]}.`

  return z
    .int({ error: requiredMessage })
    .min(DUE_HOURS_MIN, { error: requiredMessage })
    .max(DUE_HOURS_MAX, {
      error: `O prazo máximo é de ${DUE_HOURS_MAX} horas.`,
    })
}

export const departmentDueHoursSchema = z.object({
  criticaHours: dueHoursSchema("critica"),
  altaHours: dueHoursSchema("alta"),
  mediaHours: dueHoursSchema("media"),
  baixaHours: dueHoursSchema("baixa"),
})

export type DepartmentDueHoursInput = z.infer<typeof departmentDueHoursSchema>

export const saveDepartmentDueHoursSchema = departmentDueHoursSchema.extend({
  departmentId: departmentIdSchema,
})

export type SaveDepartmentDueHoursInput = z.infer<
  typeof saveDepartmentDueHoursSchema
>

export const dueHoursSearchParamsSchema = z.object({
  [DUE_HOURS_DEPARTMENT_PARAM]: idSearchParamSchema("Setor inválido.")
    .optional()
    .catch(undefined),
})

export type DueHoursSearchParams = z.infer<typeof dueHoursSearchParamsSchema>
