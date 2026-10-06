import type { Metadata } from "next"

import { requireSession } from "@/app/_lib/auth/session"
import { countMyTicketsByTab, listMyTickets } from "@/app/_lib/data/my-tickets"
import {
  formatRangeLabel,
  resolvePeriodFilterRange,
  todayKey,
} from "@/app/_lib/date"
import {
  MY_TICKETS_LABEL,
  MY_TICKETS_PATH,
  MY_TICKETS_PERIOD_PRESETS,
  MY_TICKETS_TAB_RULES,
  MY_TICKETS_TABS,
  myTicketsEmptyCopy,
} from "@/app/_lib/domain/my-tickets"
import {
  myTicketsTabHref,
  parseMyTicketsPeriod,
  parseMyTicketsTab,
} from "@/app/_lib/validation/my-tickets"

import AppTopBar from "../_components/app-top-bar"
import PeriodFilter from "../_components/period-filter"
import TicketListEmptyState from "../_components/ticket-list-empty-state"
import TicketListTabs from "../_components/ticket-list-tabs"
import MyTicketsTable from "./_components/my-tickets-table"

export const metadata: Metadata = {
  title: MY_TICKETS_LABEL,
}

const MyTicketsPage = async ({ searchParams }: PageProps<"/tickets">) => {
  const actor = await requireSession()
  const raw = await searchParams
  const tab = parseMyTicketsTab(raw)
  const now = new Date()
  const period = parseMyTicketsPeriod(raw, todayKey(now))
  const range = resolvePeriodFilterRange(period, now)
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
          <TicketListTabs
            ariaLabel="Abas de Meus chamados"
            current={tab}
            items={MY_TICKETS_TABS.map((item) => ({
              value: item,
              label: MY_TICKETS_TAB_RULES[item].label,
              count: counts[item],
              href: myTicketsTabHref(item, period),
            }))}
          />
        </div>

        {tickets.length === 0 ? (
          <div className="flex flex-col gap-4">
            {periodFilter}
            <TicketListEmptyState {...myTicketsEmptyCopy(tab, period)} />
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
