import type { Metadata } from "next"

import { requireSession } from "@/app/_lib/auth/session"
import { countMyTicketsByTab, listMyTickets } from "@/app/_lib/data/my-tickets"
import { formatRangeLabel, resolvePeriodFilterRange } from "@/app/_lib/date"
import {
  MY_TICKETS_LABEL,
  MY_TICKETS_PATH,
  MY_TICKETS_PERIOD_PRESETS,
  myTicketsEmptyCopy,
} from "@/app/_lib/domain/my-tickets"
import {
  myTicketsTabHref,
  parseMyTicketsPeriod,
  parseMyTicketsTab,
} from "@/app/_lib/validation/my-tickets"

import AppTopBar from "../_components/app-top-bar"
import PeriodFilter from "../_components/period-filter"
import MyTicketsEmptyState from "./_components/my-tickets-empty-state"
import MyTicketsTable from "./_components/my-tickets-table"
import MyTicketsTabs from "./_components/my-tickets-tabs"

export const metadata: Metadata = {
  title: MY_TICKETS_LABEL,
}

const MyTicketsPage = async ({ searchParams }: PageProps<"/tickets">) => {
  const actor = await requireSession()
  const raw = await searchParams
  const tab = parseMyTicketsTab(raw)
  const period = parseMyTicketsPeriod(raw)
  const range = resolvePeriodFilterRange(period)
  const [tickets, counts] = await Promise.all([
    listMyTickets(actor.id, tab, range),
    countMyTicketsByTab(actor.id, range),
  ])

  const periodFilter = (
    <PeriodFilter
      pathname={MY_TICKETS_PATH}
      keep={{ tab }}
      presets={MY_TICKETS_PERIOD_PRESETS}
      selection={period}
    />
  )

  return (
    <>
      <AppTopBar />
      <div className="flex flex-col gap-5.5 px-5 pt-5 pb-8 lg:px-6">
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="font-heading text-title font-semibold">
              {MY_TICKETS_LABEL}
            </h1>
            {range !== null ? (
              <p className="text-caption text-muted-foreground">
                {formatRangeLabel(range)}
              </p>
            ) : null}
          </div>
          <MyTicketsTabs current={tab} counts={counts} period={period} />
        </div>

        {tickets.length === 0 ? (
          <div className="flex flex-col gap-4">
            {periodFilter}
            <MyTicketsEmptyState copy={myTicketsEmptyCopy(tab, period)} />
          </div>
        ) : (
          <MyTicketsTable
            key={myTicketsTabHref(tab, period)}
            tab={tab}
            tickets={tickets}
            periodFilter={periodFilter}
          />
        )}
      </div>
    </>
  )
}

export default MyTicketsPage
