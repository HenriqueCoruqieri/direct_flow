import type { Metadata } from "next"

import { requireSession } from "@/app/_lib/auth/session"
import { countMyTicketsByTab, listMyTickets } from "@/app/_lib/data/my-tickets"
import { MY_TICKETS_LABEL } from "@/app/_lib/domain/my-tickets"
import { parseMyTicketsTab } from "@/app/_lib/validation/my-tickets"

import AppTopBar from "../_components/app-top-bar"
import MyTicketsEmptyState from "./_components/my-tickets-empty-state"
import MyTicketsTable from "./_components/my-tickets-table"
import MyTicketsTabs from "./_components/my-tickets-tabs"

export const metadata: Metadata = {
  title: MY_TICKETS_LABEL,
}

const MyTicketsPage = async ({ searchParams }: PageProps<"/tickets">) => {
  const actor = await requireSession()
  const tab = parseMyTicketsTab(await searchParams)
  const [tickets, counts] = await Promise.all([
    listMyTickets(actor.id, tab),
    countMyTicketsByTab(actor.id),
  ])

  return (
    <>
      <AppTopBar />
      <div className="flex flex-col gap-5.5 px-5 pt-5 pb-8 lg:px-6">
        <div className="flex flex-col gap-3.5">
          <h1 className="font-heading text-title font-semibold">
            {MY_TICKETS_LABEL}
          </h1>
          <MyTicketsTabs current={tab} counts={counts} />
        </div>

        {tickets.length === 0 ? (
          <MyTicketsEmptyState tab={tab} />
        ) : (
          <MyTicketsTable key={tab} tab={tab} tickets={tickets} />
        )}
      </div>
    </>
  )
}

export default MyTicketsPage
