import { z } from "zod"

import {
  DEFAULT_MY_TICKETS_TAB,
  MY_TICKETS_PATH,
  MY_TICKETS_TABS,
} from "@/app/_lib/domain/my-tickets"
import type { MyTicketsTab } from "@/app/_lib/types/my-tickets"
import {
  firstSearchParam,
  type RawSearchParams,
} from "@/app/_lib/validation/search-params"

export const myTicketsSearchParamsSchema = z.object({
  tab: z.enum(MY_TICKETS_TABS, { error: "Aba inválida." }),
})

export type MyTicketsSearchParams = z.infer<typeof myTicketsSearchParamsSchema>

export const parseMyTicketsTab = (raw: RawSearchParams): MyTicketsTab => {
  const result = myTicketsSearchParamsSchema.safeParse({
    tab: firstSearchParam(raw.tab),
  })
  return result.success ? result.data.tab : DEFAULT_MY_TICKETS_TAB
}

export const myTicketsTabHref = (tab: MyTicketsTab): string =>
  `${MY_TICKETS_PATH}?${new URLSearchParams({ tab }).toString()}`
