import { z } from "zod"

import { DEFAULT_APPROVALS_PERIOD } from "@/app/_lib/domain/approvals"
import { DASHBOARD_PATH, OVERDUE_QUEUE_TAB } from "@/app/_lib/domain/dashboard"
import { DEFAULT_DEPARTMENT_QUEUE_PERIOD } from "@/app/_lib/domain/department-queue"
import { DEFAULT_PERIOD, PRESET_PERIODS } from "@/app/_lib/domain/period"
import { ticketDetailPath } from "@/app/_lib/domain/ticket"
import {
  TICKET_DETAIL_FROM_DASHBOARD,
  TICKET_DETAIL_FROM_PARAM,
} from "@/app/_lib/domain/ticket-detail-origin"
import type { DateKey, PeriodSelection } from "@/app/_lib/types/period"
import { approvalsHref } from "@/app/_lib/validation/approvals"
import { departmentQueueHref } from "@/app/_lib/validation/department-queue"
import {
  customPeriodSchema,
  periodFilterHref,
  readPeriodParams,
  serializePeriodParams,
} from "@/app/_lib/validation/period"
import type { RawSearchParams } from "@/app/_lib/validation/search-params"

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

export const dashboardHref = (selection: PeriodSelection): string =>
  periodFilterHref(DASHBOARD_PATH, {}, selection)

const DASHBOARD_PERIOD_PARAM_KEYS = ["periodo", "de", "ate"] as const

export const dashboardCanonicalHref = (
  raw: RawSearchParams,
  selection: PeriodSelection,
): string | null => {
  const canonical = new URLSearchParams(serializeDashboardParams(selection))
  const isCanonical = DASHBOARD_PERIOD_PARAM_KEYS.every(
    (key) => raw[key] === (canonical.get(key) ?? undefined),
  )
  return isCanonical ? null : dashboardHref(selection)
}

export const dashboardTicketDetailHref = (
  selection: PeriodSelection,
  ticketId: number,
): string =>
  periodFilterHref(
    ticketDetailPath(ticketId),
    { [TICKET_DETAIL_FROM_PARAM]: TICKET_DETAIL_FROM_DASHBOARD },
    selection,
  )

export const OVERDUE_QUEUE_HREF = departmentQueueHref({
  tab: OVERDUE_QUEUE_TAB,
  period: DEFAULT_DEPARTMENT_QUEUE_PERIOD,
  departmentId: null,
})

export const TRANSFERS_APPROVALS_HREF = approvalsHref(DEFAULT_APPROVALS_PERIOD)
