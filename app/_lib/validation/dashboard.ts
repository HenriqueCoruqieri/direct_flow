import { z } from "zod"

import { DEFAULT_APPROVALS_PERIOD } from "@/app/_lib/domain/approvals"
import { OVERDUE_QUEUE_TAB } from "@/app/_lib/domain/dashboard"
import { DEFAULT_DEPARTMENT_QUEUE_PERIOD } from "@/app/_lib/domain/department-queue"
import { DEFAULT_PERIOD, PRESET_PERIODS } from "@/app/_lib/domain/period"
import type { DateKey, PeriodSelection } from "@/app/_lib/types/period"
import { approvalsHref } from "@/app/_lib/validation/approvals"
import { departmentQueueHref } from "@/app/_lib/validation/department-queue"
import {
  customPeriodSchema,
  readPeriodParams,
  serializePeriodParams,
} from "@/app/_lib/validation/period"
import type { RawSearchParams } from "@/app/_lib/validation/search-params"
import { approvalsTicketDetailHref } from "@/app/_lib/validation/ticket-detail-origin"

export const dashboardSearchParamsSchema = (today: DateKey) =>
  z.discriminatedUnion("periodo", [
    z.object({ periodo: z.enum(PRESET_PERIODS) }),
    customPeriodSchema(today),
  ])

export type DashboardSearchParams = z.infer<
  ReturnType<typeof dashboardSearchParamsSchema>
>

export const parseDashboardParams = (
  raw: RawSearchParams,
  today: DateKey,
): PeriodSelection => {
  const result = dashboardSearchParamsSchema(today).safeParse(
    readPeriodParams(raw),
  )
  return result.success ? result.data : { periodo: DEFAULT_PERIOD }
}

export const serializeDashboardParams = (selection: PeriodSelection): string =>
  serializePeriodParams(selection)

export const OVERDUE_QUEUE_HREF = departmentQueueHref({
  tab: OVERDUE_QUEUE_TAB,
  period: DEFAULT_DEPARTMENT_QUEUE_PERIOD,
  departmentId: null,
})

export const TRANSFERS_APPROVALS_HREF = approvalsHref(DEFAULT_APPROVALS_PERIOD)

export const incomingTransferTicketHref = (ticketId: number): string =>
  approvalsTicketDetailHref(DEFAULT_APPROVALS_PERIOD, ticketId)
