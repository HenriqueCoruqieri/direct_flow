import { z } from "zod"

import { formatInteger } from "@/app/_lib/date"
import {
  GOAL_HOURS_LIMIT_MAX,
  GOAL_OVERDUE_TICKETS_MAX,
  GOAL_PERCENT_MAX,
  GOAL_PERCENT_MIN,
  GOAL_TMA_HOURS_MAX,
  GOAL_TMA_HOURS_MIN,
  GOAL_TMR_HOURS_MAX,
  GOAL_TMR_HOURS_MIN,
} from "@/app/_lib/domain/department-goals"
import { departmentIdSchema } from "@/app/_lib/validation/department"

const goalNumberSchema = (
  requiredMessage: string,
  min: number,
  max: number,
  maxMessage: string,
) =>
  z
    .int({ error: requiredMessage })
    .min(min, { error: requiredMessage })
    .max(max, { error: maxMessage })

export const departmentGoalsSchema = z.object({
  slaMinPercent: goalNumberSchema(
    `Informe o SLA mínimo, de ${GOAL_PERCENT_MIN} a ${GOAL_PERCENT_MAX}.`,
    GOAL_PERCENT_MIN,
    GOAL_PERCENT_MAX,
    `O valor máximo é ${GOAL_PERCENT_MAX}%.`,
  ),
  tmaMaxHours: goalNumberSchema(
    `Informe o TMA máximo, em horas inteiras, a partir de ${GOAL_TMA_HOURS_MIN}.`,
    GOAL_TMA_HOURS_MIN,
    GOAL_TMA_HOURS_MAX,
    `O valor máximo é ${formatInteger(GOAL_TMA_HOURS_MAX)} horas.`,
  ),
  overdueHoursLimit: goalNumberSchema(
    "Informe o limite de horas em atraso, em horas inteiras, a partir de 0.",
    0,
    GOAL_HOURS_LIMIT_MAX,
    `O valor máximo é ${formatInteger(GOAL_HOURS_LIMIT_MAX)} horas.`,
  ),
  overdueTicketsLimit: goalNumberSchema(
    "Informe o limite de chamados em atraso, em chamados, a partir de 0.",
    0,
    GOAL_OVERDUE_TICKETS_MAX,
    `O valor máximo é ${formatInteger(GOAL_OVERDUE_TICKETS_MAX)} chamados.`,
  ),
  tmrMaxHours: goalNumberSchema(
    `Informe o TMR máximo, em horas inteiras, a partir de ${GOAL_TMR_HOURS_MIN}.`,
    GOAL_TMR_HOURS_MIN,
    GOAL_TMR_HOURS_MAX,
    `O valor máximo é ${formatInteger(GOAL_TMR_HOURS_MAX)} horas.`,
  ),
})

export type DepartmentGoalsInput = z.infer<typeof departmentGoalsSchema>

export const saveDepartmentGoalsSchema = departmentGoalsSchema.extend({
  departmentId: departmentIdSchema,
})

export type SaveDepartmentGoalsInput = z.infer<typeof saveDepartmentGoalsSchema>
