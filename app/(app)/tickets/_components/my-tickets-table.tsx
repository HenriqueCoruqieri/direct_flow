"use client"

import { createColumnHelper } from "@tanstack/react-table"
import { useMemo } from "react"

import DataTable from "@/app/_components/data-table/data-table"
import type { DataTableFeatures } from "@/app/_components/data-table/data-table-features"
import type { DataTableFilter } from "@/app/_components/data-table/data-table-filters"
import { MY_TICKETS_TAB_RULES } from "@/app/_lib/domain/my-tickets"
import { ticketDetailPath } from "@/app/_lib/domain/ticket"
import type {
  MyTicketListItem,
  MyTicketsTab,
} from "@/app/_lib/types/my-tickets"

import createTicketListColumns from "../../_components/ticket-list-columns"
import {
  TICKET_TYPE_FILTER,
  ticketRowHref,
  ticketStatusFiltersFor,
  ticketTagFiltersFor,
} from "../../_components/ticket-list-filters"

const columnHelper = createColumnHelper<DataTableFeatures, MyTicketListItem>()
const shared = createTicketListColumns<MyTicketListItem>(ticketDetailPath)

const columns = columnHelper.columns([
  shared.number,
  shared.title,
  shared.type,
  shared.tag,
  columnHelper.accessor("currentDepartmentName", {
    header: "Setor atual",
  }),
  shared.status,
  shared.createdAt,
])

interface MyTicketsTableProps {
  tab: MyTicketsTab
  tickets: MyTicketListItem[]
  periodFilter: React.ReactNode
}

const MyTicketsTable = ({
  tab,
  tickets,
  periodFilter,
}: MyTicketsTableProps) => {
  const filters = useMemo<DataTableFilter[]>(
    () => [
      ...ticketStatusFiltersFor(MY_TICKETS_TAB_RULES[tab].statuses),
      TICKET_TYPE_FILTER,
      ...ticketTagFiltersFor(tickets),
    ],
    [tab, tickets],
  )

  return (
    <DataTable
      columns={columns}
      data={tickets}
      emptyMessage={MY_TICKETS_TAB_RULES[tab].emptyTitle}
      filters={filters}
      rowHref={ticketRowHref}
      toolbarFooter={periodFilter}
    />
  )
}

export default MyTicketsTable
