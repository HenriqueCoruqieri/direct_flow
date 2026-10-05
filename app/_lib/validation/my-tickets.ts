import { z } from "zod"

import {
  DEFAULT_MY_TICKETS_PERIOD,
  DEFAULT_MY_TICKETS_TAB,
  MY_TICKETS_PATH,
  MY_TICKETS_PERIOD_PRESETS,
  MY_TICKETS_TABS,
} from "@/app/_lib/domain/my-tickets"
import type { MyTicketsTab } from "@/app/_lib/types/my-tickets"
import type { PeriodFilterSelection } from "@/app/_lib/types/period"
import {
  customPeriodSchema,
  periodFilterHref,
  readPeriodParams,
} from "@/app/_lib/validation/period"
import {
  firstSearchParam,
  type RawSearchParams,
} from "@/app/_lib/validation/search-params"

export const myTicketsSearchParamsSchema = z.object({
  tab: z.enum(MY_TICKETS_TABS, { error: "Aba inválida." }),
})

export type MyTicketsSearchParams = z.infer<typeof myTicketsSearchParamsSchema>

export const myTicketsPeriodSchema = z.discriminatedUnion("periodo", [
  z.object({ periodo: z.enum(MY_TICKETS_PERIOD_PRESETS) }),
  customPeriodSchema,
])

export type MyTicketsPeriodParams = z.infer<typeof myTicketsPeriodSchema>

export const parseMyTicketsTab = (raw: RawSearchParams): MyTicketsTab => {
  const result = myTicketsSearchParamsSchema.safeParse({
    tab: firstSearchParam(raw.tab),
  })
  return result.success ? result.data.tab : DEFAULT_MY_TICKETS_TAB
}

export const parseMyTicketsPeriod = (
  raw: RawSearchParams,
): PeriodFilterSelection => {
  const result = myTicketsPeriodSchema.safeParse(readPeriodParams(raw))
  return result.success ? result.data : DEFAULT_MY_TICKETS_PERIOD
}

export const myTicketsTabHref = (
  tab: MyTicketsTab,
  period: PeriodFilterSelection,
): string => periodFilterHref(MY_TICKETS_PATH, { tab }, period)
