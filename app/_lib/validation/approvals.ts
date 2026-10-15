import type { z } from "zod"

import {
  APPROVALS_PATH,
  DEFAULT_APPROVALS_PERIOD,
} from "@/app/_lib/domain/approvals"
import type { DateKey, PeriodFilterSelection } from "@/app/_lib/types/period"
import {
  allTimePeriodSchema,
  periodFilterHref,
  readPeriodParams,
} from "@/app/_lib/validation/period"
import type { RawSearchParams } from "@/app/_lib/validation/search-params"

export const approvalsPeriodSchema = allTimePeriodSchema

export type ApprovalsPeriodParams = z.infer<
  ReturnType<typeof approvalsPeriodSchema>
>

export const parseApprovalsPeriod = (
  raw: RawSearchParams,
  today: DateKey,
): PeriodFilterSelection => {
  const result = approvalsPeriodSchema(today).safeParse(readPeriodParams(raw))
  return result.success ? result.data : DEFAULT_APPROVALS_PERIOD
}

export const approvalsHref = (period: PeriodFilterSelection): string =>
  periodFilterHref(APPROVALS_PATH, {}, period)
